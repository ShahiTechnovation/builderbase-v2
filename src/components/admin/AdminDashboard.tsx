import React, { useState } from 'react';
import './admin-dashboard.css';

export default function AdminDashboard({ config }: { config: any }) {
    const [activeTab, setActiveTab] = useState('partners');
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

    const submitBaserow = async (e: React.FormEvent, tableId: string) => {
        e.preventDefault();
        setStatus({ type: 'loading', message: 'Saving to database...' });

        const formData = new FormData(e.target as HTMLFormElement);
        const payload: Record<string, any> = {};
        
        formData.forEach((value, key) => {
            if (value) {
                if (key === 'Public' || key === 'Featured' || key === 'Logo use permitted') {
                    payload[key] = value === 'on';
                } else if (key === 'Logo width' || key === 'Logo height' || key === 'Homepage rank') {
                    payload[key] = parseInt(value as string, 10);
                } else if (key === 'Stack' || key === 'Photos URLs') {
                    payload[key] = (value as string).split(',').map(s => s.trim());
                } else {
                    payload[key] = value;
                }
            }
        });

        // Checkboxes not in formData if unchecked
        ['Public', 'Featured', 'Logo use permitted'].forEach(key => {
            if (!payload[key] && (e.target as HTMLFormElement).elements.namedItem(key)) {
                payload[key] = false;
            }
        });

        try {
            const res = await fetch(`${config.apiUrl}/api/database/rows/table/${tableId}/?user_field_names=true`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${config.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                setStatus({ type: 'success', message: 'Successfully added to Baserow!' });
                (e.target as HTMLFormElement).reset();
            } else {
                const text = await res.text();
                setStatus({ type: 'error', message: `Error: ${text}` });
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: `Network Error: ${err.message}` });
        }
    };

    return (
        <section className="admin-section">
            <header className="admin-header">
                <p className="admin-meta meta">Live Database Connection</p>
                <h1 className="admin-title">Command Center</h1>
                <p className="admin-subtitle">Directly manage the ecosystem data. Content synchronises instantly with Baserow.</p>
            </header>

            <div className="admin-tabs">
                {['partners', 'events', 'projects'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setStatus({ type: 'idle', message: '' }); }}
                        className={`admin-tab ${activeTab === tab ? 'is-active' : ''}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="admin-content">
                {status.message && (
                    <div className={`admin-status admin-status--${status.type}`}>
                        {status.message}
                    </div>
                )}

                {activeTab === 'partners' && (
                    <form onSubmit={(e) => submitBaserow(e, config.tables.partners)} className="admin-form">
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" name="Name" required placeholder="Organization Name" />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <input type="text" name="Type" placeholder="Company, DAO, Community..." />
                        </div>
                        <div className="form-group">
                            <label>Website URL</label>
                            <input type="url" name="Website" placeholder="https://" />
                        </div>
                        <div className="form-group">
                            <label>Logo URL</label>
                            <input type="url" name="Logo URL" placeholder="https://" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Logo Width (px)</label>
                                <input type="number" name="Logo width" placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label>Logo Height (px)</label>
                                <input type="number" name="Logo height" placeholder="0" />
                            </div>
                        </div>
                        <div className="form-row">
                            <label className="checkbox-label">
                                <input type="checkbox" name="Public" defaultChecked />
                                <span>Public</span>
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" name="Logo use permitted" defaultChecked />
                                <span>Logo use permitted</span>
                            </label>
                        </div>
                        <button type="submit" disabled={status.type === 'loading'} className="admin-submit">
                            Add Partner
                        </button>
                    </form>
                )}

                {activeTab === 'events' && (
                    <form onSubmit={(e) => submitBaserow(e, config.tables.events)} className="admin-form">
                        <div className="form-group">
                            <label>Title</label>
                            <input type="text" name="Title" required placeholder="Full Event Name" />
                        </div>
                        <div className="form-group">
                            <label>Short Title</label>
                            <input type="text" name="Short title" placeholder="Short Name" />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" name="Date" required />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <input type="text" name="Type" placeholder="Hackathon, Workshop, Meetup..." />
                        </div>
                        <div className="form-group">
                            <label>Cover Photo URL</label>
                            <input type="url" name="Cover photo URL" placeholder="https://" />
                        </div>
                        <div className="form-group">
                            <label>Gallery Photos (Comma separated URLs)</label>
                            <textarea name="Photos URLs" rows={3} placeholder="https://..., https://..."></textarea>
                        </div>
                        <div className="form-group">
                            <label>Summary</label>
                            <textarea name="Summary" rows={3} placeholder="Brief summary of the event..."></textarea>
                        </div>
                        <div className="form-group">
                            <label>External URL (Luma, etc.)</label>
                            <input type="url" name="External URL" placeholder="https://" />
                        </div>
                        <div className="form-row">
                            <label className="checkbox-label">
                                <input type="checkbox" name="Public" defaultChecked />
                                <span>Public</span>
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" name="Featured" />
                                <span>Featured</span>
                            </label>
                        </div>
                        <button type="submit" disabled={status.type === 'loading'} className="admin-submit">
                            Add Event
                        </button>
                    </form>
                )}

                {activeTab === 'projects' && (
                    <form onSubmit={(e) => submitBaserow(e, config.tables.projects)} className="admin-form">
                        <div className="form-group">
                            <label>Project Title</label>
                            <input type="text" name="Title" required placeholder="Project Name" />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea name="Description" required rows={3} placeholder="What does it do?"></textarea>
                        </div>
                        <div className="form-group">
                            <label>Stack (Comma separated)</label>
                            <input type="text" name="Stack" placeholder="React, Node.js, Astro" />
                        </div>
                        <div className="form-group">
                            <label>Screenshot URL</label>
                            <input type="url" name="Screenshot URL" placeholder="https://" />
                        </div>
                        <div className="form-group">
                            <label>Live URL</label>
                            <input type="url" name="Live URL" placeholder="https://" />
                        </div>
                        <div className="form-group">
                            <label>Repository URL (GitHub)</label>
                            <input type="url" name="Repository URL" placeholder="https://" />
                        </div>
                        <div className="form-row">
                            <label className="checkbox-label">
                                <input type="checkbox" name="Public" defaultChecked />
                                <span>Public</span>
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" name="Featured" />
                                <span>Featured</span>
                            </label>
                        </div>
                        <button type="submit" disabled={status.type === 'loading'} className="admin-submit">
                            Add Project
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
}
