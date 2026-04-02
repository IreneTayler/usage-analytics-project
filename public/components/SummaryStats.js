const SummaryStats = ({ summary }) => {
    return (
        <div className="summary-stats">
            <div className="stat-card">
                <div className="stat-value">{summary.total_committed}</div>
                <div className="stat-label">Total Committed</div>
            </div>
            <div className="stat-card">
                <div className="stat-value">{summary.avg_daily}</div>
                <div className="stat-label">Daily Average</div>
            </div>
            <div className="stat-card">
                <div className="stat-value">{summary.peak_day.count}</div>
                <div className="stat-label">Peak Day</div>
                <div className="stat-sublabel">{new Date(summary.peak_day.date).toLocaleDateString()}</div>
            </div>
            <div className="stat-card">
                <div className="stat-value">{summary.current_streak}</div>
                <div className="stat-label">Current Streak</div>
                <div className="stat-sublabel">days active</div>
            </div>
        </div>
    );
};