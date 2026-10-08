import './global.css';
// Layout
import MainLayout from '@/layouts/MainLayout';

export const metadata = {
    title: 'RAG App',
    description: 'RAG App',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <link href="https://harvard-iacs.github.io/2021-AC215/style/images/logo.png" rel="shortcut icon" type="image/x-icon"></link>
                <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=0, maximum-scale=1, minimum-scale=1" />
                <title>RAG App</title>
            </head>
            <body>
                <MainLayout>
                    {children}
                </MainLayout>
            </body>
        </html>
    )
}