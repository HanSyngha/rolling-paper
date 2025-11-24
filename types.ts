export type GroupId =
  | 'ESD'
  | 'FDM'
  | 'BDM'
  | 'DV1'
  | 'DV2'
  | 'DV3'
  | 'DV4'
  | 'ET'
  | 'AT'
  | 'PV'
  | 'AI Agent'
  | 'GTE'
  | 'TDE'
  | '공정'
  | '개발지원과'
  | 'Staff';

export interface Group {
  id: GroupId;
  name: string;
  description: string;
  color: string;
}

export interface Message {
  id: string;
  author: string;
  group: GroupId;
  content: string;
  timestamp: number;
  likes: number;
  passwordHash?: string; // Hashed password for edit/delete protection
}

export const GROUPS: Group[] = [
  { id: 'ESD', name: 'ESD', description: 'ESD 그룹', color: 'bg-red-100' },
  { id: 'FDM', name: 'FDM', description: 'FDM 그룹', color: 'bg-orange-100' },
  { id: 'BDM', name: 'BDM', description: 'BDM 그룹', color: 'bg-amber-100' },
  { id: 'DV1', name: 'DV1', description: 'DV1 그룹', color: 'bg-yellow-100' },
  { id: 'DV2', name: 'DV2', description: 'DV2 그룹', color: 'bg-lime-100' },
  { id: 'DV3', name: 'DV3', description: 'DV3 그룹', color: 'bg-green-100' },
  { id: 'DV4', name: 'DV4', description: 'DV4 그룹', color: 'bg-emerald-100' },
  { id: 'ET', name: 'ET', description: 'ET 그룹', color: 'bg-teal-100' },
  { id: 'AT', name: 'AT', description: 'AT 그룹', color: 'bg-cyan-100' },
  { id: 'PV', name: 'PV', description: 'PV 그룹', color: 'bg-sky-100' },
  { id: 'AI Agent', name: 'AI Agent', description: 'AI Agent 그룹', color: 'bg-blue-100' },
  { id: 'GTE', name: 'GTE', description: 'GTE 그룹', color: 'bg-indigo-100' },
  { id: 'TDE', name: 'TDE', description: 'TDE 그룹', color: 'bg-violet-100' },
  { id: '공정', name: '공정', description: '공정 그룹', color: 'bg-purple-100' },
  { id: '개발지원과', name: '개발지원과', description: '개발지원과 그룹', color: 'bg-pink-100' },
  { id: 'Staff', name: 'Staff', description: 'Staff 그룹', color: 'bg-rose-100' },
];