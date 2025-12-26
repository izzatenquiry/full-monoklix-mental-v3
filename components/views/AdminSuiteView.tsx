
import React, { useState } from 'react';
import Tabs, { type Tab } from '../common/Tabs';
import MasterDashboardView from './MasterDashboardView';
import TokenMasterView from './TokenMasterView';
import AdminDashboardView from './AdminDashboardView';
import ETutorialAdminView from './ETutorialAdminView';
import { type User, type Language } from '../../types';

type AdminTabId = 'server-status' | 'token-master' | 'user-db' | 'content-admin';

interface AdminSuiteViewProps {
    currentUser: User;
    language: Language;
}

const AdminSuiteView: React.FC<AdminSuiteViewProps> = ({ currentUser, language }) => {
    const [activeTab, setActiveTab] = useState<AdminTabId>('server-status');

    const tabs: Tab<AdminTabId>[] = [
        { id: 'server-status', label: 'Server Status' },
        { id: 'token-master', label: 'Token Master' },
        { id: 'user-db', label: 'User Database' },
        { id: 'content-admin', label: 'Content Admin' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'server-status':
                return <MasterDashboardView currentUser={currentUser} language={language} />;
            case 'token-master':
                return <TokenMasterView />;
            case 'user-db':
                return <AdminDashboardView language={language} />;
            case 'content-admin':
                return <ETutorialAdminView />;
            default:
                return null;
        }
    };

    return (
        <div className="h-auto lg:h-full flex flex-col">
            <div className="flex-shrink-0 mb-6 flex justify-center">
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminSuiteView;
