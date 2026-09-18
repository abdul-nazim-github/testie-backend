export interface TelegraAuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    firstName: string;
    middleName: string;
    lastName: string;
    picture: string;
    phone: string;
    role: string;
    fullName: string;
    settings: Record<string, any>;
    twoFactorType: string;
    status: string;
    isServiceAccount: boolean;
    requireServiceAccount2FA: boolean;
    serviceAccountKeySetAt: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    affiliate: string;
  };
}
