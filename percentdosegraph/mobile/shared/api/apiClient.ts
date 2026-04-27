import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const DrugSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  maxDailyDose: z.number(),
  unit: z.string(),
  drugClass: z.string().optional(),
});

const DoseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  drugId: z.union([z.string(), z.number()]),
  date: z.string(),
  amount: z.number(),
  route: z.string(),
});

const ProfileSchema = z.object({
  id: z.string(),
  label: z.string(),
  drugCount: z.number(),
  eventCount: z.number(),
  createdAt: z.string(),
});

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getDrugs() {
    const response = await this.client.get('/drugs');
    return z.array(DrugSchema).parse(response.data);
  }

  async getDoses() {
    const response = await this.client.get('/doses');
    return z.array(DoseSchema).parse(response.data);
  }

  async getProfiles() {
    const response = await this.client.get('/profiles');
    return z.array(ProfileSchema).parse(response.data);
  }

  async createProfile(profile: any) {
    const response = await this.client.post('/profiles', profile);
    return ProfileSchema.parse(response.data);
  }

  async createDose(dose: any) {
    const response = await this.client.post('/doses', dose);
    return DoseSchema.parse(response.data);
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(name: string, email: string, password: string) {
    const response = await this.client.post('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
