import { useState } from 'react';
import styles from './NameSetup.module.css';

export const NameSetup = ({ onNameSet }) => {
  const [username, setUsername] = useState('');

  const handleSetName = () => {
    if (username.trim()) {
      onNameSet(username.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSetName();
    }
  };

  return (
    <div className={styles.nameSetup}>
      <div className={styles.subtitle}>Введите ваш никнейм</div>
      <div className={styles.nameInputContainer}>
        <input
          className={styles.nameInput}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Ваш никнейм"
          onKeyPress={handleKeyPress}
        />
        <button className={styles.continueButton} onClick={handleSetName}>
          Продолжить
        </button>
      </div>
    </div>
  );
};