import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, push, onValue, set, onDisconnect, get } from 'firebase/database';
import { db } from '../../shared/api/firebase';
import { uploadToImageBB } from '../../shared/lib/imagebb';
import { ImageOverlay } from './ImageOverlay';
import styles from './Chat.module.scss';

const SendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const ImageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 19V5H3v14h18zm0-16c1.1 0 2 .9 2 2v14a2 2 0 0 1-2 2H3c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h18zM8.9 11.5l2.1 2.58L14.1 10l4.9 6H5l3.9-4.5z" />
  </svg>
);

export const Chat = ({ username }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [expandedImage, setExpandedImage] = useState(null);

  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const cooldownRef = useRef(null);

  // Функция для очистки пустых сообщений
  const cleanupEmptyMessages = useCallback(async () => {
    try {
      const messagesRef = ref(db, 'messages');
      const snapshot = await get(messagesRef);
      const data = snapshot.val();
      
      if (data) {
        const cleanupPromises = Object.entries(data).map(async ([key, msg]) => {
          // Удаляем сообщения без отправителя или с пустым текстом
          if (!msg.sender || !msg.sender.trim() || msg.sender === 'undefined' || 
              (!msg.text?.trim() && !msg.imageUrl)) {
            await set(ref(db, `messages/${key}`), null);
            console.log('Удалено пустое сообщение:', key);
          }
        });
        
        await Promise.all(cleanupPromises);
      }
    } catch (error) {
      console.error('Ошибка при очистке сообщений:', error);
    }
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    }

    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, [cooldown]);

  useEffect(() => {
    // Очистка пустых сообщений при загрузке
    cleanupEmptyMessages();

    const messagesRef = ref(db, 'messages');
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesArray = Object.entries(data)
          .map(([key, msg]) => ({
            ...msg,
            isMe: msg.sender === username,
            id: key,
          }))
          .filter(msg => 
            msg.sender && 
            msg.sender.trim() !== '' && 
            msg.sender !== 'undefined' &&
            (msg.text?.trim() !== '' || msg.imageUrl)
          );
        setMessages(messagesArray);
      } else {
        setMessages([]);
      }
    });

    const typingRef = ref(db, 'typing');
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersTyping = Object.keys(data).filter(
          (user) => data[user] && user !== username
        );
        setTypingUsers(usersTyping);
      }
    });

    const onlineRef = ref(db, 'onlineUsers');
    const unsubscribeOnline = onValue(onlineRef, (snapshot) => {
      const data = snapshot.val() || {};
      setOnlineUsers(Object.keys(data));
    });

    const userRef = ref(db, `onlineUsers/${username}`);
    set(userRef, true);
    onDisconnect(userRef).remove();

    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      unsubscribeOnline();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [username, cleanupEmptyMessages]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTyping = useCallback(() => {
    const typingRef = ref(db, 'typing/' + username);
    set(typingRef, true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => set(typingRef, false), 3000);
  }, [username]);

  const handleSend = async () => {
    if (cooldown > 0) return;
    if (!message.trim() && !mediaFile) return;

    // Дополнительная проверка на пустое сообщение
    if (!message.trim() && !mediaFile) {
      return;
    }

    setUploading(true);

    let imageUrl = null;
    if (mediaFile) {
      try {
        const uploaded = await uploadToImageBB(mediaFile);
        imageUrl = uploaded.url;
      } catch (err) {
        console.error(err);
        setUploading(false);
        return;
      }
    }

    await push(ref(db, 'messages'), {
      text: message.trim(), // обрезаем пробелы
      sender: username,
      time: new Date().toLocaleTimeString(),
      imageUrl: imageUrl || null,
    });

    setCooldown(5);
    setMessage('');
    setMediaFile(null);
    setMediaPreview(null);
    setUploading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const openImageFullscreen = (imageUrl) => {
    setExpandedImage(imageUrl);
  };

  const closeImageFullscreen = () => {
    setExpandedImage(null);
  };

  const isSendDisabled = cooldown > 0 || uploading || (!message.trim() && !mediaFile);
  const buttonContent = cooldown > 0 ? cooldown : (uploading ? '📤' : <SendIcon />);
  const placeholder = cooldown > 0 ? `Подождите ${cooldown} сек...` : "Введите сообщение...";

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <div className={styles.title}>Чат: {username}</div>
        <div className={styles.onlineStatus}>
          Онлайн: {onlineUsers.join(', ')}
        </div>
      </div>

      {typingUsers.length > 0 && (
        <div className={styles.typingIndicator}>
          {`${typingUsers.join(', ')} печатает...`}
        </div>
      )}

      <div ref={listRef} className={styles.messagesList}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.messageItem} ${msg.isMe ? styles.myMessage : ''}`}>
            <div className={`${styles.messageBubble} ${msg.isMe ? styles.myBubble : styles.otherBubble}`}>
              <div className={styles.messageMeta}>
                {msg.sender} • {msg.time}
              </div>
              {msg.imageUrl && (
                <div className={styles.mediaMessage}>
                  <img 
                    src={msg.imageUrl} 
                    alt="media" 
                    className={styles.mediaItem}
                    onClick={() => openImageFullscreen(msg.imageUrl)}
                  />
                </div>
              )}
              {msg.text && <div className={styles.messageText}>{msg.text}</div>}
            </div>
          </div>
        ))}
      </div>

      {mediaPreview && (
        <div className={styles.mediaPreview}>
          <img 
            src={mediaPreview} 
            alt="preview" 
            className={styles.mediaItem}
            onClick={() => openImageFullscreen(mediaPreview)}
          />
          <button onClick={removeMedia} className={styles.removeMediaButton}>
            ✕
          </button>
        </div>
      )}

      {cooldown > 0 && (
        <div className={styles.cooldownIndicator}>
          ⏳ Следующее сообщение через: {cooldown} сек
        </div>
      )}

      <ImageOverlay 
        imageUrl={expandedImage}
        onClose={closeImageFullscreen}
      />

      <div className={styles.inputContainer}>
        <label className={styles.uploadButton}>
          <ImageIcon />
          <input type="file" accept="image/*,image/gif" onChange={handleImageChange} />
        </label>
        <textarea
          className={styles.textField}
          value={message}
          onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          rows={1}
          disabled={cooldown > 0 || uploading}
        />
        <button 
          className={styles.sendButton} 
          onClick={handleSend} 
          disabled={isSendDisabled}
          title={cooldown > 0 ? `Подождите ${cooldown} секунд` : "Отправить сообщение"}
        >
          {buttonContent}
        </button>
      </div>
    </div>
  );
};
