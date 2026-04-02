const Header = ({ plan, period }) => {
    return (
        <div className="stats-header">
            <h2>Usage Analytics</h2>
            <div className="plan-info">
                <span className="plan-badge">{plan.toUpperCase()}</span>
                <span className="period">
                    {new Date(period.from).toLocaleDateString()} - {new Date(period.to).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
};