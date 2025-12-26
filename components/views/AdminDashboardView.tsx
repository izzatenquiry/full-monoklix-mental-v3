
import React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllUsers, updateUserStatus, replaceUsers, exportAllUserData, forceUserLogout, updateUserSubscription, saveUserPersonalAuthToken, addNewUser, removeUser, updateUserBatch02 } from '../../services/userService';
import { type User, type UserStatus, type UserRole, type Language } from '../../types';
import { UsersIcon, XIcon, DownloadIcon, UploadIcon, CheckCircleIcon, AlertTriangleIcon, VideoIcon, TrashIcon, DatabaseIcon, KeyIcon } from '../Icons';
import Spinner from '../common/Spinner';
import ApiHealthCheckModal from '../common/ApiHealthCheckModal';
import ConfirmationModal from '../common/ConfirmationModal';

const formatStatus = (user: User): { text: string; color: 'green' | 'yellow' | 'red' | 'blue' } => {
    switch(user.status) {
        case 'admin':
            return { text: 'Admin', color: 'blue' };
        case 'lifetime':
            return { text: 'Lifetime', color: 'green' };
        case 'subscription':
            return { text: 'Subscription', color: 'green' };
        case 'trial':
            return { text: 'Trial', color: 'yellow' };
        case 'inactive':
            return { text: 'Inactive', color: 'red' };
        default:
            return { text: 'Unknown', color: 'red' };
    }
};

const statusColors: Record<'green' | 'yellow' | 'red' | 'blue', string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    blue: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
};

const TrialCountdown: React.FC<{ expiry: number }> = ({ expiry }) => {
    const calculateRemainingTime = useCallback(() => {
        const now = Date.now();
        const timeLeft = expiry - now;

        if (timeLeft <= 0) {
            return { text: 'Expired', color: 'red' as const };
        }

        const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);

        return { text: `Expires in ${minutes}m ${seconds}s`, color: 'yellow' as const };
    }, [expiry]);
    
    const [timeInfo, setTimeInfo] = useState(calculateRemainingTime());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeInfo(calculateRemainingTime());
        }, 1000);

        return () => clearInterval(timer);
    }, [expiry, calculateRemainingTime]);

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[timeInfo.color]}`}>
            {timeInfo.text}
        </span>
    );
};

const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

interface AdminDashboardViewProps {
  language: Language;
}

const StatBox: React.FC<{ title: string; icon: React.ReactNode; data: { label: string; value: number }[]; total: number; color: string; }> = ({ title, icon, data, total, color }) => {
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    return (
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                {icon}
                <h4 className="font-bold text-neutral-800 dark:text-neutral-200">{title}</h4>
            </div>
            <div className="space-y-3 text-sm overflow-y-auto custom-scrollbar pr-2 flex-1 max-h-48">
                {sortedData.length > 0 ? sortedData.map(({ label, value }) => {
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    return (
                        <div key={label}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-mono text-neutral-600 dark:text-neutral-400 truncate max-w-[60%]">{label}</span>
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{value}</span>
                            </div>
                            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                                <div 
                                    className={`h-1.5 rounded-full ${color}`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                }) : <p className="text-xs text-neutral-500">No active users.</p>}
            </div>
        </div>
    );
};

const UsageDashboard: React.FC<{ users: User[] }> = ({ users }) => {
    const stats = useMemo(() => {
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        
        const activeUsers = users.filter(user => 
            user.role !== 'admin' && user.lastSeenAt && (now - new Date(user.lastSeenAt).getTime()) < oneHour
        );
        const totalActive = activeUsers.length;

        const appVersionStats = activeUsers.reduce((acc, user) => {
            const version = user.appVersion || 'Unknown';
            acc[version] = (acc[version] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const proxyServerStats = activeUsers.reduce((acc, user) => {
            const server = user.proxyServer ? user.proxyServer.replace('https://', '').replace('.monoklix.com', '') : 'None';
            acc[server] = (acc[server] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const allNonAdminUsers = users.filter(u => u.role !== 'admin');
        const totalUsers = allNonAdminUsers.length;
        const batchStats = allNonAdminUsers.reduce((acc, user) => {
            if (user.batch_02 === 'batch_02') {
                acc.batch02 += 1;
            } else {
                acc.batch01 += 1;
            }
            return acc;
        }, { batch01: 0, batch02: 0 });

        const tokenStats = activeUsers.reduce((acc, user) => {
            const token = user.personalAuthToken ? `...${user.personalAuthToken.slice(-10)}` : 'None';
            acc[token] = (acc[token] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            appVersionData: Object.entries(appVersionStats).map(([label, value]) => ({ label, value })),
            proxyServerData: Object.entries(proxyServerStats).map(([label, value]) => ({ label, value })),
            batchData: [
                { label: 'Batch 01', value: batchStats.batch01 },
                { label: 'Batch 02', value: batchStats.batch02 }
            ],
            tokenData: Object.entries(tokenStats).map(([label, value]) => ({ label, value })),
            totalActive,
            totalUsers
        };
    }, [users]);
    
    return (
        <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-neutral-200">Usage Dashboard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatBox 
                    title="App Version (Active)" 
                    icon={<CheckCircleIcon className="w-5 h-5 text-green-500" />}
                    data={stats.appVersionData}
                    total={stats.totalActive}
                    color="bg-gradient-to-r from-green-400 to-green-600"
                />
                
                <StatBox 
                    title="Proxy Server (Active)" 
                    icon={<UsersIcon className="w-5 h-5 text-blue-500" />}
                    data={stats.proxyServerData}
                    total={stats.totalActive}
                    color="bg-gradient-to-r from-blue-400 to-blue-600"
                />

                <StatBox 
                    title="Batch Number (All Users)" 
                    icon={<DatabaseIcon className="w-5 h-5 text-purple-500" />}
                    data={stats.batchData}
                    total={stats.totalUsers}
                    color="bg-gradient-to-r from-purple-400 to-purple-600"
                />
                
                <StatBox 
                    title="Auth Token (Active)" 
                    icon={<KeyIcon className="w-5 h-5 text-yellow-500" />}
                    data={stats.tokenData}
                    total={stats.totalActive}
                    color="bg-gradient-to-r from-yellow-400 to-yellow-600"
                />
            </div>
        </div>
    );
};


const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ language }) => {
    const [users, setUsers] = useState<User[] | null>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newStatus, setNewStatus] = useState<UserStatus>('trial');
    const [subscriptionDuration, setSubscriptionDuration] = useState<6 | 12>(6);
    const [personalToken, setPersonalToken] = useState<string>('');
    const [batch02, setBatch02] = useState<string>('');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
    const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
    const [userForHealthCheck, setUserForHealthCheck] = useState<User | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [newUser, setNewUser] = useState<{email: string; phone: string; status: UserStatus; fullName: string; role: UserRole; batch_02: string}>({ email: '', phone: '', status: 'trial', fullName: '', role: 'user', batch_02: '' });
    const [addUserError, setAddUserError] = useState<string | null>(null);
    const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const allUsers = await getAllUsers();
        if (allUsers) {
            setUsers(allUsers); // We need all users for the dashboard
        } else {
            setUsers(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setNewStatus(user.status);
        setPersonalToken(user.personalAuthToken || '');
        setBatch02(user.batch_02 || '');
        setIsModalOpen(true);
    };

    const veoAuthorizedUsersCount = useMemo(() => {
        if (!users) return 0;
        // Filter for users who have a non-empty, non-whitespace personal auth token.
        return users.filter(u => u.personalAuthToken && u.personalAuthToken.trim()).length;
    }, [users]);


    const handleSaveChanges = async () => {
        if (!selectedUser) return;
        setStatusMessage({ type: 'loading', message: 'Saving changes...' });

        // Status update logic with VEO check
        const statusPromise = new Promise<{ success: boolean, message?: string }>(async (resolve) => {
            const isUpgradingToVeo = (newStatus === 'lifetime' || newStatus === 'subscription') &&
                                    (selectedUser.status !== 'lifetime' && selectedUser.status !== 'subscription');

            // Only block if we are upgrading a user who does NOT already have a token, and the limit is reached.
            if (isUpgradingToVeo && !selectedUser.personalAuthToken && veoAuthorizedUsersCount >= 4) {
                return resolve({ success: false, message: 'Cannot upgrade user status. Veo 3.0 authorization is limited to fewer than 5 users.' });
            }
            if (newStatus === selectedUser.status) return resolve({ success: true });
            
            let success = false;
            if (newStatus === 'subscription') {
                success = await updateUserSubscription(selectedUser.id, subscriptionDuration);
            } else {
                success = await updateUserStatus(selectedUser.id, newStatus);
            }
            resolve({ success });
        });

        // Token update logic
        const tokenPromise = new Promise<{ success: boolean; message?: string }>(async (resolve) => {
            const currentToken = selectedUser.personalAuthToken || '';
            const newToken = personalToken.trim();
            if (newToken === currentToken) return resolve({ success: true });

            const result = await saveUserPersonalAuthToken(selectedUser.id, newToken || null);
            if (result.success === false) {
                resolve({ success: false, message: result.message });
            } else {
                resolve({ success: true });
            }
        });
        
        const batchPromise = updateUserBatch02(selectedUser.id, batch02.trim() || null);

        const [statusResult, tokenResult, batchResult] = await Promise.all([statusPromise, tokenPromise, batchPromise]);

        const errorMessages = [];
        if (!statusResult.success) {
            errorMessages.push(statusResult.message || 'Failed to update status.');
        }
        if (tokenResult.success === false) {
            errorMessages.push(tokenResult.message || 'Failed to update token.');
        }
        if (!batchResult) {
            errorMessages.push('Failed to update batch.');
        }

        if (errorMessages.length > 0) {
            setStatusMessage({ type: 'error', message: errorMessages.join(' ') });
        } else {
            setStatusMessage({ type: 'success', message: `User ${selectedUser.username} updated successfully.` });
            fetchUsers();
        }

        setIsModalOpen(false);
        setSelectedUser(null);
        setTimeout(() => setStatusMessage(null), 5000);
    };
    
    const handleForceLogout = () => {
        if (!selectedUser) return;
        setIsConfirmLogoutOpen(true);
    };

    const executeForceLogout = async () => {
        if (!selectedUser) return;
        
        if (await forceUserLogout(selectedUser.id)) {
            await fetchUsers();
            setStatusMessage({ type: 'success', message: `Session for ${selectedUser.username} has been terminated.` });
        } else {
             setStatusMessage({ type: 'error', message: 'Failed to terminate session.' });
        }
        setIsModalOpen(false);
        setIsConfirmLogoutOpen(false);
        setSelectedUser(null);
        setTimeout(() => setStatusMessage(null), 4000);
    };


    const handleExport = async () => {
        setStatusMessage(null);
        const usersToExport = await exportAllUserData();
        if (!usersToExport) {
            setStatusMessage({ type: 'error', message: 'Export failed: User database is corrupt.' });
            setTimeout(() => setStatusMessage(null), 4000);
            return;
        }

        try {
            const dataStr = JSON.stringify(usersToExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `monoklix-users-backup-${timestamp}.json`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setStatusMessage({ type: 'success', message: 'User data exported successfully.' });
        } catch (error) {
             setStatusMessage({ type: 'error', message: 'Failed to create export file.' });
        }
        setTimeout(() => setStatusMessage(null), 5000);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStatusMessage(null);
        const file = event.target.files?.[0];
        if (!file) return;

        if (window.confirm("Are you sure you want to replace all existing user data with this file's content? This cannot be undone.")) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') throw new Error("Failed to read file.");
                    
                    const importedUsers = JSON.parse(text);
                    const result = await replaceUsers(importedUsers);

                    if (result.success) {
                        setStatusMessage({ type: 'success', message: result.message });
                        fetchUsers(); // Refresh the view
                    } else {
                        setStatusMessage({ type: 'error', message: result.message });
                    }
                } catch (error) {
                    setStatusMessage({ type: 'error', message: `Error importing file: ${error instanceof Error ? error.message : 'Invalid file format.'}` });
                } finally {
                     if(event.target) event.target.value = '';
                     setTimeout(() => setStatusMessage(null), 5000);
                }
            };
            reader.readAsText(file);
        } else {
            if(event.target) event.target.value = '';
        }
    };

    const handleAddNewUser = async () => {
        setAddUserError(null);
        setStatusMessage({ type: 'loading', message: 'Adding new user...' });
        const result = await addNewUser({ ...newUser, batch_02: newUser.batch_02.trim() || null });
    
        if (result.success) {
            setStatusMessage({ type: 'success', message: `User ${newUser.email} added successfully.` });
            fetchUsers();
            setIsAddUserModalOpen(false);
            setNewUser({ email: '', phone: '', status: 'trial', fullName: '', role: 'user', batch_02: '' });
        } else {
            setStatusMessage(null); // Clear loading message
            setAddUserError(result.message || 'An unknown error occurred.');
        }
    };
    
    const handleRemoveUser = () => {
        if (!selectedUser) return;
        setIsConfirmRemoveOpen(true);
    };
    
    const executeRemoveUser = async () => {
        if (!selectedUser) return;
        
        const result = await removeUser(selectedUser.id);
        if (result.success) {
            setStatusMessage({ type: 'success', message: `User ${selectedUser.username} has been removed.` });
            fetchUsers();
        } else {
             setStatusMessage({ type: 'error', message: `Failed to remove user: ${result.message}` });
        }
        setIsModalOpen(false);
        setIsConfirmRemoveOpen(false);
        setSelectedUser(null);
        setTimeout(() => setStatusMessage(null), 4000);
    };

    const usersWithoutAdmin = useMemo(() => users?.filter(user => user.role !== 'admin') || [], [users]);

    const filteredUsers = useMemo(() => {
        if (!users) return [];

        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        
        let displayedUsers: User[];
        const userList = users.filter(user => user.role !== 'admin');

        if (searchTerm.trim() === '') {
            // No search term, show only active users
            displayedUsers = userList.filter(user => 
                user.lastSeenAt && (now - new Date(user.lastSeenAt).getTime()) < oneHour
            );
        } else {
            // Search term exists, search all users
            displayedUsers = userList.filter(user =>
                (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.phone || '').includes(searchTerm)
            );
        }

        // Sort the displayedUsers, keeping active users on top
        return displayedUsers.sort((a, b) => {
            const aLastSeen = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
            const bLastSeen = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;

            const aIsOnline = aLastSeen > 0 && (now - aLastSeen) < oneHour;
            const bIsOnline = bLastSeen > 0 && (now - bLastSeen) < oneHour;

            if (aIsOnline && !bIsOnline) return -1;
            if (!aIsOnline && bIsOnline) return 1;
            
            return bLastSeen - aLastSeen;
        });
    }, [users, searchTerm]);
    
    const activeUsersCount = useMemo(() => {
        if (!users) return 0;
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;
        return users.filter(user => 
            user.role !== 'admin' && user.lastSeenAt && (now - new Date(user.lastSeenAt).getTime()) < oneHour
        ).length;
    }, [users]);

    if (loading) {
        return <div>Loading users...</div>;
    }

    if (users === null) {
        return (
            <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">Critical Error:</strong>
                <span className="block sm:inline"> The user database is corrupt and could not be read. Please contact support.</span>
            </div>
        );
    }

    return (
        <>
            {users && <UsageDashboard users={users} />}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-2">User Database</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Manage users, subscriptions, and database backups.</p>
                
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <input
                        type="text"
                        placeholder="Search by username, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm bg-white dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    />
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 font-semibold py-2 px-3 rounded-lg">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span>{activeUsersCount} Active Users</span>
                        </div>
                         <button onClick={() => { setUserForHealthCheck(null); setIsHealthModalOpen(true); }} className="flex items-center gap-2 text-sm bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors">
                            <CheckCircleIcon className="w-4 h-4" />
                            API Health Summary
                        </button>
                        <button onClick={() => setIsAddUserModalOpen(true)} className="flex items-center gap-2 text-sm bg-green-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-green-700 transition-colors">
                            <UsersIcon className="w-4 h-4" />
                            Add User
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                        <button onClick={handleImportClick} className="flex items-center gap-2 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-3 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
                            <UploadIcon className="w-4 h-4" />
                            Import
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-2 text-sm bg-primary-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-primary-700 transition-colors">
                            <DownloadIcon className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>

                 {statusMessage && (
                    <div className={`p-3 rounded-md mb-4 text-sm ${statusMessage.type === 'loading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : statusMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>
                        {statusMessage.message}
                    </div>
                )}

                <div className="bg-white dark:bg-neutral-950 rounded-lg shadow-inner">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-neutral-500 dark:text-neutral-400">
                            <thead className="text-xs text-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-800/50 dark:text-neutral-400">
                                <tr>
                                    <th scope="col" className="px-4 py-3">#</th>
                                    <th scope="col" className="px-6 py-3">
                                        Email
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Phone Number
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Last Login
                                    </th>
                                     <th scope="col" className="px-6 py-3">
                                        Version
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Device
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Server
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Batch
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Token
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Actions
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Check API
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user, index) => {
                                        const { text, color } = formatStatus(user);
                                        
                                        let activeInfo: { text: string; color: 'green' | 'gray' | 'red'; fullDate: string; } = { text: 'Never', color: 'red', fullDate: 'N/A' };
                                        if (user.lastSeenAt) {
                                            const lastSeenDate = new Date(user.lastSeenAt);
                                            const diffMinutes = (new Date().getTime() - lastSeenDate.getTime()) / (1000 * 60);
                                            if (diffMinutes < 60) {
                                                activeInfo = { text: 'Active now', color: 'green', fullDate: lastSeenDate.toLocaleString() };
                                            } else {
                                                activeInfo = { text: getTimeAgo(lastSeenDate), color: 'gray', fullDate: lastSeenDate.toLocaleString() };
                                            }
                                        }
                                        const activeStatusColors: Record<'green' | 'gray' | 'red', string> = {
                                            green: 'bg-green-500',
                                            gray: 'bg-neutral-400',
                                            red: 'bg-red-500',
                                        };

                                        return (
                                            <tr key={user.id} className="bg-white dark:bg-neutral-950 border-b dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                                                <td className="px-4 py-4 font-medium text-neutral-600 dark:text-neutral-400">{index + 1}</td>
                                                <th scope="row" className="px-6 py-4 font-medium text-neutral-900 whitespace-nowrap dark:text-white">
                                                    <div>{user.username || '-'}</div>
                                                    <div className="text-xs text-neutral-500">{user.email || '-'}</div>
                                                </th>
                                                <td className="px-6 py-4">
                                                    {user.phone || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2" title={`Last seen: ${activeInfo.fullDate}`}>
                                                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${activeStatusColors[activeInfo.color]}`}></span>
                                                        <span>{activeInfo.text}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.appVersion || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono text-neutral-600 dark:text-neutral-300">
                                                    {user.lastDevice || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                                                    {user.proxyServer ? user.proxyServer.replace('https://', '').replace('.monoklix.com', '') : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.batch_02 || '-'}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                                    {user.personalAuthToken ? `...${user.personalAuthToken.slice(-6)}` : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[color]}`}>
                                                            {text}
                                                        </span>
                                                        {user.status === 'subscription' && user.subscriptionExpiry && (
                                                            <div className="text-xs text-neutral-500 mt-1">
                                                                Expires: {new Date(user.subscriptionExpiry).toLocaleDateString()}
                                                                {Date.now() > user.subscriptionExpiry && <span className="text-red-500 font-bold"> (Expired)</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button 
                                                        onClick={() => openEditModal(user)}
                                                        className="font-medium text-primary-600 dark:text-primary-500 hover:underline"
                                                    >
                                                        Update
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                     <button
                                                        onClick={() => { setUserForHealthCheck(user); setIsHealthModalOpen(true); }}
                                                        className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                                        title={'Check API health'}
                                                    >
                                                        Check
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={12} className="text-center py-10">
                                            {usersWithoutAdmin.length > 0 ? (
                                                <div>
                                                    <p className="mt-2 font-semibold">No users found.</p>
                                                    <p className="text-xs">{searchTerm ? `No users match your search for "${searchTerm}".` : 'No users have been active in the last hour.'}</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <UsersIcon className="w-12 h-12 mx-auto text-neutral-400" />
                                                    <p className="mt-2 font-semibold">No registered users yet.</p>
                                                    <p className="text-xs">When new users register, they will appear here.</p>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {isAddUserModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Add New User</h3>
                            <button onClick={() => setIsAddUserModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="new-fullname" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Full Name</label>
                                <input id="new-fullname" type="text" value={newUser.fullName} onChange={(e) => setNewUser({...newUser, fullName: e.target.value})} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2" />
                            </div>
                            <div>
                                <label htmlFor="new-email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email Address</label>
                                <input id="new-email" type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2" />
                            </div>
                            <div>
                                <label htmlFor="new-phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Phone Number</label>
                                <input id="new-phone" type="text" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="new-status" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Account Status</label>
                                    <select id="new-status" value={newUser.status} onChange={(e) => setNewUser({...newUser, status: e.target.value as UserStatus})} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2">
                                        <option value="trial">Trial</option>
                                        <option value="subscription">Subscription</option>
                                        <option value="lifetime">Lifetime</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="new-role" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Role</label>
                                    <select id="new-role" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2">
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                        <option value="special_user">Special User</option>
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="new-batch" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Batch</label>
                                <input id="new-batch" type="text" value={newUser.batch_02} onChange={(e) => setNewUser({...newUser, batch_02: e.target.value})} className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2" />
                            </div>
                            {addUserError && <p className="text-red-500 text-sm">{addUserError}</p>}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => { setIsAddUserModalOpen(false); setAddUserError(null); }} className="px-4 py-2 text-sm font-semibold bg-neutral-200 dark:bg-neutral-600 rounded-lg">Cancel</button>
                            <button onClick={handleAddNewUser} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg">Add User</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Edit User</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm">Updating profile for <span className="font-semibold">{selectedUser.username}</span>.</p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="status-select" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Account Status
                                </label>
                                <select
                                    id="status-select"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                                    className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                >
                                    <option value="trial">Trial</option>
                                    <option value="subscription">Subscription</option>
                                    <option value="lifetime">Lifetime</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="token-input" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Personal Auth Token
                                </label>
                                <input
                                    id="token-input"
                                    type="text"
                                    value={personalToken}
                                    onChange={(e) => setPersonalToken(e.target.value)}
                                    placeholder="User's personal __SESSION token"
                                    className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono text-xs"
                                />
                            </div>
                             <div>
                                <label htmlFor="batch-input" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Batch
                                </label>
                                <input
                                    id="batch-input"
                                    type="text"
                                    value={batch02}
                                    onChange={(e) => setBatch02(e.target.value)}
                                    placeholder="e.g., batch_02"
                                    className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                />
                            </div>
                            {newStatus === 'subscription' && (
                                <div className="mt-4 p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-md">
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        Subscription Duration
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center">
                                            <input type="radio" name="duration" value={6} checked={subscriptionDuration === 6} onChange={() => setSubscriptionDuration(6)} className="form-radio" />
                                            <span className="ml-2">6 Months</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input type="radio" name="duration" value={12} checked={subscriptionDuration === 12} onChange={() => setSubscriptionDuration(12)} className="form-radio" />
                                            <span className="ml-2">12 Months</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleForceLogout}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                                >
                                    <XIcon className="w-4 h-4" />
                                    Force Logout
                                </button>
                                <button
                                    onClick={handleRemoveUser}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    Remove User
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold bg-neutral-200 dark:bg-neutral-600 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveChanges}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {isConfirmLogoutOpen && selectedUser && (
                <ConfirmationModal
                    isOpen={isConfirmLogoutOpen}
                    title="Confirm Force Logout"
                    message={`Are you sure you want to terminate ${selectedUser.username}'s current session? They will be logged out immediately, but their account will remain active.`}
                    onConfirm={executeForceLogout}
                    onCancel={() => setIsConfirmLogoutOpen(false)}
                    confirmText="Force Logout"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    language={language}
                />
            )}

            {isConfirmRemoveOpen && selectedUser && (
                <ConfirmationModal
                    isOpen={isConfirmRemoveOpen}
                    title="Confirm Remove User"
                    message={`Are you sure you want to permanently remove ${selectedUser.username}? This action cannot be undone.`}
                    onConfirm={executeRemoveUser}
                    onCancel={() => setIsConfirmRemoveOpen(false)}
                    confirmText="Remove User"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                    language={language}
                />
            )}

            {isHealthModalOpen && (
                <ApiHealthCheckModal
                    isOpen={isHealthModalOpen}
                    onClose={() => {
                        setIsHealthModalOpen(false);
                        setUserForHealthCheck(null);
                    }}
                    user={userForHealthCheck}
                    language={language}
                />
            )}
        </>
    );
};

export default AdminDashboardView;