import { storage } from '../api/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadToFirebase = async (file) => {
  try {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `chat_images/${timestamp}_${randomString}_${file.name}`;
    
    const storageRef = ref(storage, fileName);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      fileName: fileName
    };
  } catch (error) {
    console.error('Firebase upload error:', error);
    throw error;
  }
};
