'use client';

import { useState, useEffect } from 'react';
import { Plus, Smartphone, Trash2, RefreshCw, QrCode as QrIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface Device {
    id: string;
    phoneNumber?: string;
    displayName?: string;
    sessionStatus?: string;
    connectedAt?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [newDeviceName, setNewDeviceName] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        loadDevices();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const loadDevices = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/devices`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to load devices');

            const data = await response.json();
            if (data.success) {
                setDevices(data.data);
            }
        } catch (err: any) {
            console.error('Error loading devices:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDevice = async () => {
        if (!newDeviceName) return;

        try {
            setIsConnecting(true);
            const response = await fetch(`${API_URL}/api/devices`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ displayName: newDeviceName })
            });

            const data = await response.json();
            if (data.success) {
                setQrCode(data.data.qrCode);
                // Start polling for status
                pollStatus(data.data.id);
            } else {
                alert('Failed to connect: ' + data.error);
                setIsConnecting(false);
            }
        } catch (err) {
            console.error('Error adding device:', err);
            setIsConnecting(false);
        }
    };

    const pollStatus = async (deviceId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${API_URL}/api/devices/${deviceId}`, {
                    headers: getAuthHeaders()
                });
                const data = await response.json();

                if (data.success) {
                    if (data.data.qrCode && !qrCode) {
                        setQrCode(data.data.qrCode);
                    }

                    if (data.data.sessionStatus === 'connected') {
                        clearInterval(interval);
                        setShowAddModal(false);
                        setQrCode(null);
                        setNewDeviceName('');
                        setIsConnecting(false);
                        loadDevices();
                        alert('Device Connected Successfully!');
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);

        // Cleanup after 2 minutes
        setTimeout(() => {
            clearInterval(interval);
            if (isConnecting) {
                setIsConnecting(false);
                // alert('Connection timed out. Please try again.');
            }
        }, 120000);
    };

    const deleteDevice = async (deviceId: string) => {
        if (!confirm('Are you sure you want to disconnect this device?')) return;

        try {
            await fetch(`${API_URL}/api/devices/${deviceId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            loadDevices();
        } catch (err) {
            console.error('Failed to delete device:', err);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
                    <p className="text-gray-500">Manage your connected WhatsApp numbers</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="h-5 w-5" />
                    Add Device
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading devices...</div>
            ) : devices.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed">
                    <Smartphone className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900">No Devices Connected</h3>
                    <p className="text-gray-500 mt-2 mb-6">Connect your first WhatsApp number to get started</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="h-5 w-5" />
                        Connect WhatsApp
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {devices.map((device) => (
                        <div key={device.id} className="bg-white rounded-xl shadow-sm border p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-green-100 p-3 rounded-full">
                                    <Smartphone className="h-6 w-6 text-green-600" />
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${device.sessionStatus === 'connected'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {device.sessionStatus || 'Unknown'}
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {device.displayName || 'Unnamed Device'}
                            </h3>
                            <p className="text-gray-500 text-sm mb-4">
                                {device.phoneNumber || 'No phone number'}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t">
                                <span className="text-xs text-gray-400">
                                    ID: {device.id.substring(0, 8)}...
                                </span>
                                <button
                                    onClick={() => deleteDevice(device.id)}
                                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                                    title="Disconnect"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Device Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Connect WhatsApp</h3>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setQrCode(null);
                                    setIsConnecting(false);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <Trash2 className="h-5 w-5 rotate-45" /> {/* Close icon workaround */}
                            </button>
                        </div>

                        {!qrCode ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Sales Support"
                                        value={newDeviceName}
                                        onChange={(e) => setNewDeviceName(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleAddDevice}
                                    disabled={!newDeviceName || isConnecting}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {isConnecting && <RefreshCw className="h-4 w-4 animate-spin" />}
                                    {isConnecting ? 'Generating QR...' : 'Get QR Code'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="bg-gray-100 p-4 rounded-lg mb-4 inline-block">
                                    {/* Display QR Code Image */}
                                    <img src={qrCode} alt="Scan QR Code" className="w-64 h-64 mx-auto" />
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p>1. Open WhatsApp on your phone</p>
                                    <p>2. Tap Menu or Settings and select Linked Devices</p>
                                    <p>3. Tap on Link a Device</p>
                                    <p>4. Point your phone to this screen to capture the code</p>
                                </div>
                                <div className="mt-6 flex items-center justify-center gap-2 text-blue-600">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    <span>Waiting for connection...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
