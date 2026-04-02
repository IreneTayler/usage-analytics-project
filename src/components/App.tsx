import React from 'react'
import UsageStats from './UsageStats'

const App: React.FC = () => {
    return (
        <div className="app">
            <UsageStats days={7} />
        </div>
    )
}

export default App