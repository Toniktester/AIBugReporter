'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Building2 } from 'lucide-react';
import styles from './page.module.css';

interface Project {
    id: string;
    name: string;
}

export default function ProjectsClient() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newProjectName, setNewProjectName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/projects');
            if (!res.ok) throw new Error('Failed to load projects');
            const data = await res.json();
            setProjects(data.projects || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        
        try {
            const res = await fetch('/api/admin/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProjectName.trim() })
            });
            if (!res.ok) throw new Error('Failed to create project');
            setNewProjectName('');
            fetchProjects();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editingName.trim()) return;
        try {
            const res = await fetch(`/api/admin/projects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingName.trim() })
            });
            if (!res.ok) throw new Error('Failed to update project');
            setEditingId(null);
            fetchProjects();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete project "${name}"? This action cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/projects/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete project');
            fetchProjects();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className={styles.projectManager}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            
            <form onSubmit={handleCreate} className={styles.addProjectForm} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div className={styles.inputWithIcon} style={{ flexGrow: 1 }}>
                    <Building2 size={18} className={styles.inputIcon} />
                    <input 
                        type="text" 
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter new project name..." 
                        required
                        style={{ width: '100%' }}
                    />
                </div>
                <button type="submit" className={styles.primaryBtn} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'stretch' }}>
                    <Plus size={18} /> Add Project
                </button>
            </form>

            {loading ? (
                <div style={{ color: 'var(--text-muted)' }}>Loading projects...</div>
            ) : projects.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>No projects found. Create one above.</div>
            ) : (
                <div className={styles.integrationList}>
                    {projects.map((project) => (
                        <div key={project.id} className={styles.integrationItem}>
                            {editingId === project.id ? (
                                <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        value={editingName} 
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className={styles.formGroup}
                                        style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--primary-color)', background: 'transparent', color: 'white', flexGrow: 1 }}
                                        autoFocus
                                    />
                                    <button onClick={() => handleUpdate(project.id)} className={styles.outlineBtn} style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)' }} title="Save">
                                        <Check size={16} />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className={styles.outlineBtn} title="Cancel">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.integrationInfo}>
                                        <div className={styles.integrationIcon} style={{ background: 'var(--primary-gradient)' }}>
                                            {project.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3>{project.name}</h3>
                                            <p>ID: <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>{project.id}</span></p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button 
                                            onClick={() => { setEditingId(project.id); setEditingName(project.name); }} 
                                            className={styles.outlineBtn} 
                                            title="Edit Project Name"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(project.id, project.name)} 
                                            className={styles.outlineBtn} 
                                            style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                                            title="Delete Project"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
