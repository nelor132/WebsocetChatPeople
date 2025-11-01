export const uploadToImageBB = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const apiKey = '9db54043cceb1ab969672b9334c21b1c';
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    
    if (data.success) {
      return {
        url: data.data.url,
        deleteUrl: data.data.delete_url,
        thumbUrl: data.data.thumb?.url || data.data.url
      };
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    console.error('ImageBB upload error:', error);
    throw error;
  }
};
