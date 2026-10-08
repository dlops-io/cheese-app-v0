#!/bin/bash
# Full deploy. Run inside the deployment container: sh ./docker-shell.sh
#set -euo pipefail

INV="inventory.yml"
DOMAIN="ac215-llm-rag.dlops.io"
NGINX_DIR="nginx-conf/nginx"

# Pull values out of inventory.yml so this script has one source of truth.
val() { awk -v k="$1:" '$1==k {gsub(/"/,"",$2); print $2; exit}' "$INV"; }
PROJECT="$(val gcp_project)"
REGION="$(val gcp_region)"
INSTANCE="$(val machine_instance_name)"

run() { echo; echo "==> $1"; ansible-playbook "$1" -i "$INV"; }

confirm() {
    read -r -p "$1 [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]]
}

# Check from the VM, not the container -- container egress to the domain is unreliable.
check_url() {
    ansible appserver -i "$INV" -b -m shell \
        -a "curl -sk -o /dev/null -w '%{http_code}' --max-time 15 $1" 2>/dev/null \
        | tail -1 | tr -d '[:space:]'
}

# --- 1. infrastructure -------------------------------------------------------
run deploy-create-instance.yml

IP="$(gcloud compute addresses describe "${INSTANCE}-ip" \
        --region="$REGION" --project="$PROJECT" --format='value(address)')"
echo "==> static IP: $IP"

# Point the inventory at the new host so the remaining playbooks can reach it.
sed -i -E "s/^([[:space:]]+)[0-9]+(\.[0-9]+){3}:/\1${IP}:/" "$INV"
echo "==> $INV appserver host set to $IP"

# --- 2. DNS gate -------------------------------------------------------------
echo
echo "Create or update the DNS A record:  $DOMAIN -> $IP"
confirm "Is DNS updated and propagated?" || { echo "Stopping. Re-run when DNS is ready."; exit 1; }

resolved="$(getent hosts "$DOMAIN" | awk '{print $1; exit}' || true)"
if [ "$resolved" != "$IP" ]; then
    echo "WARNING: $DOMAIN resolves to '${resolved:-nothing}', expected $IP"
    echo "Certbot will fail until this matches."
    confirm "Continue anyway?" || exit 1
fi

# --- 3. app ------------------------------------------------------------------
run deploy-provision-instance.yml
run deploy-setup-folders.yml
run deploy-docker-images-2.yml
run deploy-setup-containers.yml

# HTTP-only config first: nginx won't start against certs that don't exist yet.
cp "$NGINX_DIR/nginx.conf.http" "$NGINX_DIR/nginx.conf"
run deploy-setup-webserver.yml

echo
echo "==> http://$DOMAIN/      -> $(check_url http://$DOMAIN/)"
echo "==> http://$DOMAIN/api/  -> $(check_url http://$DOMAIN/api/)"

# --- 4. HTTPS (optional) -----------------------------------------------------
echo
confirm "Issue a Let's Encrypt certificate now?" || {
    echo "Skipped. Site is live over HTTP."
    exit 0
}

echo "==> requesting certificate for $DOMAIN"
CERTBOT_CMD="docker run --rm --name temp_certbot -v /data/certbot/letsencrypt:/etc/letsencrypt -v /data/certbot/www:/tmp/letsencrypt -v /data/servers-data/certbot/log:/var/log certbot/certbot certonly --webroot --agree-tos --renew-by-default --non-interactive --preferred-challenges http-01 --text --email shivasj@gmail.com -w /tmp/letsencrypt -d $DOMAIN"
ansible appserver -i "$INV" -b -m shell -a "$CERTBOT_CMD"

# Now the cert exists, so the 443 block can be switched on.
cp "$NGINX_DIR/nginx.conf.ssl" "$NGINX_DIR/nginx.conf"
run deploy-setup-webserver.yml

echo
echo "==> https://$DOMAIN/     -> $(check_url https://$DOMAIN/)"
echo "==> https://$DOMAIN/api/ -> $(check_url https://$DOMAIN/api/)"
echo
echo "Cert is not auto-renewing. Re-run this script's certbot step before it expires."
