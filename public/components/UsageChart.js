const UsageChart = ({ data }) => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = Recharts;

    const chartData = data.map(day => ({
        date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        committed: day.committed,
        reserved: day.reserved
    }));

    return (
        <div className="chart-container">
            <h3>Daily Usage Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [value, name === 'committed' ? 'Committed' : 'Reserved']} />
                    <Bar dataKey="committed" stackId="usage" fill="#4CAF50" />
                    <Bar dataKey="reserved" stackId="usage" fill="#FF9800" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};