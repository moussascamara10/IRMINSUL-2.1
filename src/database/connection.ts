import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connexion MongoDB réussie');

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur de connexion MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Déconnexion MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ Reconnexion MongoDB réussie');
    });
  } catch (error) {
    console.error('❌ Échec de la connexion MongoDB:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('✅ Déconnexion MongoDB réussie');
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion MongoDB:', error);
    throw error;
  }
}
