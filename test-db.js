const mongoose = require('mongoose');

const testConnection = async () => {
    try {
        const MONGODB_URI = 'mongodb+srv://SIGN_SPEAK:ys%40ys%23ys@cluster0.pcyisoh.mongodb.net/signspeak?retryWrites=true&w=majority';
        
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Successfully connected to MongoDB Atlas');
        console.log('📊 Database:', mongoose.connection.db.databaseName);
        
        // Test User model
        const { User } = require('./database/mongoSchema');
        const userCount = await User.countDocuments();
        console.log(`👥 Total users in database: ${userCount}`);
        
        await mongoose.connection.close();
        console.log('🔌 Connection closed');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
};

testConnection();