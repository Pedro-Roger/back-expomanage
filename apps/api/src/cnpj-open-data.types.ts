export interface ReceitaCompanyRecord {
  cnpj: string;
  cnpjBase: string;
  legalName: string;
  tradeName?: string;
  status?: string;
  address: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  importedAt: string;
}
