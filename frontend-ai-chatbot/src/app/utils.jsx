export function isValidJSON(text) {
    if (typeof text !== "string") return false
    try {
        JSON.parse(text)
        return true
    } catch (error) {
        return false
    }
}

export const validateRequired = (value) => !!value.length