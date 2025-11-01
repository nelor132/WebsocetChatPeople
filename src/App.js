import { useState, useEffect } from 'react';
import { NameSetup } from './features/auth/NameSetup';
import { Chat } from './features/chat/Chat';

function App() {
  const [username, setUsername] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);

  useEffect(() => {
    const savedUsername = localStorage.getItem('chatUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsNameSet(true);
    }
  }, []);

  const handleNameSet = (name) => {
    setUsername(name);
    setIsNameSet(true);
    localStorage.setItem('chatUsername', name);
  };

  const handleLogout = () => {
    setUsername('');
    setIsNameSet(false);
    localStorage.removeItem('chatUsername');
  };

  if (!isNameSet) {
    return <NameSetup onNameSet={handleNameSet} />;
  }

  return <Chat username={username} onLogout={handleLogout} />;
}

export default App;