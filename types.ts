export enum UserRole {
  GUEST = 'guest',
  PATIENT = 'patient',
  DOCTOR = 'doctor'
}

export interface UserProfile {
  age: number;
  sex: string; // '男' | '女'
  height: number; // cm
  weight: number; // kg
  waistline?: number; // cm
  systolicPressure?: number; // mmHg
  familyHistory: string; // 家族病史
  disease: string; // '是' | '否' (患病情况)
  isPregnancy?: string; // '是' | '否' (是否妊娠)
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  profile?: UserProfile; // Added profile data
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  date: string;
  category: 'diet' | 'exercise' | 'medical' | 'news';
  imageUrl: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  avatar: string;
  isOnline: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
}

export interface Scheme {
  id: string;
  title: string;
  dietPlan: string[];
  exercisePlan: string[];
  createdAt: string;
}

export interface SchemeItem {
  time: string;
  title: string;
  content: string;
  order: number;
  type: string;
  userId?: number;
}

export interface DiabetesTypeInfo {
  id: string;
  name: string;
  mechanism: string;
  symptoms: string[];
  treatment: string[];
}
