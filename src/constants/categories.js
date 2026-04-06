export const GLOBAL_CATEGORIES = [
    { id: 'all', label: 'All', icon: 'LayoutGrid' },
    { id: 'Technology', label: 'Technology', icon: 'Cpu' },
    { id: 'Science', label: 'Science', icon: 'FlaskConical' },
    { id: 'Art', label: 'Art', icon: 'Palette' },
    { id: 'Philosophy', label: 'Philosophy', icon: 'Brain' },
    { id: 'Society', label: 'Society', icon: 'Users' },
    { id: 'Innovation', label: 'Innovation', icon: 'Lightbulb' },
    { id: 'Cybersecurity', label: 'Cybersecurity', icon: 'ShieldAlert' },
    { id: 'Quantum', label: 'Quantum', icon: 'Atom' }
];

export const CATEGORY_IDS = GLOBAL_CATEGORIES.map(cat => cat.id);
