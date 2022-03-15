import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 4000;

const prisma = new PrismaClient({ log: ['error', 'query', 'info', 'warn'] });

function createToken(id: number) {
  //@ts-ignore
  return jwt.sign({ id }, process.env.MY_SECRET, { expiresIn: '1day' });
}

async function getUserFromToken(token: string) {
  //@ts-ignore
  const decodedData = jwt.verify(token, process.env.MY_SECRET);

  const user = await prisma.user.findUnique({
    //@ts-ignore
    where: { id: decodedData.id },
    include: { transactions: true }
  });
  return user;
}

app.post('/signup', async (req, res) => {
  const { email, password, fullName } = req.body;

  try {
    const hash = bcryptjs.hashSync(password, 8);
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        fullName,
        amountInAccount: Math.random() * 1000,
        transactions: {
          create: [
            {
              amount: Math.random() * 1000,
              currency: '$',
              isPositive: false,
              receiverOrSender: 'sender'
            },
            {
              amount: Math.random() * 1000,
              currency: '$',
              isPositive: true,
              receiverOrSender: 'receiver'
            }
          ]
        }
      },
      include: { transactions: true }
    });
    res.send({ user, token: createToken(user.id) });
  } catch (err) {
    //@ts-ignore
    res.status(400).send({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { transactions: true }
    });
    //@ts-ignore
    const passwordMatches = bcryptjs.compareSync(password, user.password);

    if (passwordMatches) {
      //@ts-ignore
      res.send({ user, token: createToken(user.id) });
    } else {
      throw Error('BOOM');
    }
  } catch (err) {
    res.status(400).send({ error: 'Use or/password invalid' });
  }
});

app.post('/banking-info', async (req, res) => {
  const token = req.headers.authorization || '';

  try {
    const user = await getUserFromToken(token);
    res.send(user);
  } catch (err) {
    // @ts-ignore
    res.status(400).send({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
