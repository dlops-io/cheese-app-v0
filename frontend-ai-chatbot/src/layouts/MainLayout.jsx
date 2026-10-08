'use client'

import classNames from 'classnames';
import SettingsProvider from '@/contexts/SettingsProvider';
import Header from '@/components/header';

// This is a Client Component
export default function MainLayout({ children }) {

    const showLeftSidebar = true;
    const showRightSidebar = true;

    return (
        <SettingsProvider>
            <div id="__next">
                <div className="antialiased">
                    <Header></Header>
                    <main className={classNames('flex flex-col tablet:pl-16 laptop:pl-11',)}>
                        {children}
                    </main>
                </div>
            </div>
        </SettingsProvider>
    )
}