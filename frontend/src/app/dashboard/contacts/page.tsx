'use client';

import { useState, useEffect } from 'react';
// Icons replaced with emojis - lucide-react removed
// import { Plus, Search, Trash2, User, RefreshCw, AlertCircle } from 'lucide-react';

interface Contact {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    tags?: string[];
    lastContacted?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        email: '',
        tags: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadContacts();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const loadContacts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/contacts`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to load contacts');

            const data = await response.json();
            if (data.success) {
                setContacts(data.data || []);
            }
        } catch (err: any) {
            console.error('Error loading contacts:', err);
            setContacts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContact.phone) return;

        try {
            setIsSubmitting(true);
            const payload = {
                ...newContact,
                tags: newContact.tags ? newContact.tags.split(',').map(t => t.trim()) : []
            };

            const response = await fetch(`${API_URL}/api/contacts`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                setShowAddModal(false);
                setNewContact({ name: '', phone: '', email: '', tags: '' });
                loadContacts();
            } else {
                alert('Failed to add contact: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error adding contact:', err);
            alert('Error adding contact');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteContact = async (id: string) => {
        if (!confirm('Are you sure you want to delete this contact?')) return;

        try {
            await fetch(`${API_URL}/api/contacts/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            loadContacts();
        } catch (err) {
            console.error('Failed to delete contact:', err);
        }
    };

    const filteredContacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );

    return (
        <div className="container mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
                    <p className="text-gray-500">Manage your customer database</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <span>➕</span>
                    Add Contact
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
                    <span>⚠️</span>
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading contacts...</div>
            ) : filteredContacts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed">
                    <span className="text-6xl mb-4 block">👤</span>
                    <h3 className="text-xl font-medium text-gray-900">No contacts found</h3>
                    <p className="text-gray-500 mt-2 mb-6">Add your first contact to start messaging</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <span>➕</span>
                        Add Contact
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredContacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                                {contact.name?.[0] || '👤'}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">{contact.name || 'Unknown'}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {contact.phone}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex gap-1">
                                            {contact.tags?.map((tag, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {contact.lastContacted ? new Date(contact.lastContacted).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => deleteContact(contact.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Contact Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4">Add New Contact</h3>
                        <form onSubmit={handleAddContact} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Required)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 628123456789"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                                <input
                                    type="text"
                                    placeholder="vip, customer, lead"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newContact.tags}
                                    onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {isSubmitting && <span className="animate-spin">🔄</span>}
                                    Save Contact
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
