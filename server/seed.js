const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Position = require('./models/Position');
const Candidate = require('./models/Candidate');
const Voter = require('./models/Voter');
const Vote = require('./models/Vote');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    await Position.deleteMany({});
    await Candidate.deleteMany({});
    await Voter.deleteMany({});
    await Vote.deleteMany({});

    // 1. Create Sample Voters
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('password123', salt);

    const testVoter = await Voter.create({
      matricNumber: '22/47PT001',
      fullName: 'Test Student',
      level: 400,
      password: defaultPassword,
      role: 'voter',
    });

    const adminVoter = await Voter.create({
      matricNumber: 'ADMIN/001',
      fullName: 'Electoral Chairman',
      level: 500,
      password: defaultPassword,
      role: 'admin',
    });

    console.log('Sample Voters created (Password: password123)');

    // 2. Create Executive Positions
    const presidentPos = await Position.create({ title: 'President', displayOrder: 1 });
    const vicePresidentPos = await Position.create({ title: 'Vice President', displayOrder: 2 });
    const genSecPos = await Position.create({ title: 'General Secretary', displayOrder: 3 });
    const welfarePos = await Position.create({ title: 'Welfare Director', displayOrder: 4 });

    console.log('Executive Positions created.');

    // 3. Insert Candidates
    await Candidate.insertMany([
      {
        fullName: 'Candidate A (President)',
        position: presidentPos._id,
        level: 400,
        manifesto: 'Promoting innovation, student wellness, and clinical excellence.',
        voteCount: 0,
      },
      {
        fullName: 'Candidate B (President)',
        position: presidentPos._id,
        level: 400,
        manifesto: 'Empowering departmental growth and transparent leadership.',
        voteCount: 0,
      },
      {
        fullName: 'Candidate C (Vice President)',
        position: vicePresidentPos._id,
        level: 300,
        manifesto: 'Fostering academic support and student integration.',
        voteCount: 0,
      },
      {
        fullName: 'Candidate D (General Secretary)',
        position: genSecPos._id,
        level: 300,
        manifesto: 'Streamlining communication and record management.',
        voteCount: 0,
      },
      {
        fullName: 'Candidate E (Welfare Director)',
        position: welfarePos._id,
        level: 300,
        manifesto: 'Prioritizing student physical, mental, and social health.',
        voteCount: 0,
      },
    ]);

    console.log('Sample Candidates seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error.message);
    process.exit(1);
  }
};

seedData();