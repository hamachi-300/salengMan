import { Users, ShoppingBag, Truck, Activity } from 'lucide-react';

const Dashboard = () => {
    const stats = [
        { label: 'Total Users', value: '1,284', icon: Users, color: '#3b82f6' },
        { label: 'Total Orders', value: '452', icon: ShoppingBag, color: '#22c55e' },
        { label: 'Active Drivers', value: '28', icon: Truck, color: '#f59e0b' },
        { label: 'Daily Activity', value: '+12%', icon: Activity, color: '#ef4444' },
    ];

    return (
        <div>
            <div className="header">
                <h1>Dashboard Overview</h1>
                <div className="text-muted">Last updated: {new Date().toLocaleTimeString()}</div>
            </div>

            <div className="stats-grid">
                {stats.map((stat) => (
                    <div key={stat.label} className="card stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <stat.icon size={20} style={{ color: stat.color }} />
                            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '9999px', background: `${stat.color}15`, color: stat.color }}>
                                Monthly
                            </span>
                        </div>
                        <div className="stat-label">{stat.label}</div>
                        <div className="stat-value">{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <div className="card">
                    <h2>Recent Activity</h2>
                    <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
                        Activity chart placeholder
                    </div>
                </div>
                <div className="card">
                    <h2>Popular Categories</h2>
                    <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
                        Category distribution placeholder
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
