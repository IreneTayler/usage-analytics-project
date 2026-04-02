const ProgressBar = ({ todayData, dailyLimit }) => {
    const todayUsage = todayData.committed + todayData.reserved;
    const todayProgress = (todayUsage / dailyLimit) * 100;

    return (
        <div className="today-progress">
            <h3>Today's Usage</h3>
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(todayProgress, 100)}%` }} />
            </div>
            <div className="progress-text">
                <span>{todayUsage} / {dailyLimit} requests</span>
                <span className={`percentage ${todayProgress > 80 ? 'warning' : ''}`}>
                    {Math.round(todayProgress)}%
                </span>
            </div>
            {todayData.reserved > 0 && (
                <div className="reserved-info">
                    <small>{todayData.reserved} requests currently reserved</small>
                </div>
            )}
        </div>
    );
};