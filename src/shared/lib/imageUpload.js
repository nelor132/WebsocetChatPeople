import { storage } from '../api/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadToFirebase = async (file) => {
  try {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `chat_images/${timestamp}_${randomString}_${file.name}`;
    
    const storageRef = ref(storage, fileName);
    
    // Загружаем файл
    console.log('Начинаем загрузку файла:', file.name);
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Файл успешно загружен');
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('URL получен:', downloadURL);
    
    return {
      url: downloadURL,
      fileName: fileName
    };
  } catch (error) {
    console.error('Ошибка загрузки в Firebase:', error);
    throw new Error(`Не удалось загрузить изображение: ${error.message}`);
  }
};
