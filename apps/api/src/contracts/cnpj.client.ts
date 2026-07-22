import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { getCnpjApiUrl } from "../config.js";
import { ReceitaCnpjMongoRepository } from "../cnpj-open-data.repository.js";
import type { CnpjCompanyData, CnpjLookupClient } from "./contracts.types.js";

@Injectable()
export class HttpCnpjLookupClient implements CnpjLookupClient {
  private readonly openDataRepository = new ReceitaCnpjMongoRepository();

  async lookup(cnpj: string): Promise<CnpjCompanyData> {
    const digits = onlyDigits(cnpj);

    if (digits.length !== 14) {
      throw new BadRequestException("CNPJ deve ter 14 dígitos.");
    }

    const importedCompany = await this.openDataRepository.findByCnpj(digits).catch(() => undefined);

    if (importedCompany) {
      return {
        cnpj: importedCompany.cnpj,
        legalName: importedCompany.legalName,
        address: importedCompany.address
      };
    }

    const baseUrl = getCnpjApiUrl();

    if (!baseUrl) {
      throw new ServiceUnavailableException("CNPJ não encontrado na base importada da Receita.");
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/${digits}`);

    if (!response.ok) {
      throw new ServiceUnavailableException("Não foi possível consultar o CNPJ.");
    }

    const data = await response.json() as Record<string, unknown>;

    return {
      cnpj,
      legalName: String(data.razao_social ?? data.nome ?? data.legalName ?? ""),
      address: formatCnpjAddress(data)
    };
  }
}

function formatCnpjAddress(data: Record<string, unknown>): string {
  const directAddress = data.address ?? data.endereco;

  if (typeof directAddress === "string" && directAddress.trim()) {
    return directAddress.trim();
  }

  return [
    data.logradouro,
    data.numero,
    data.bairro,
    data.municipio,
    data.uf ? String(data.uf).toUpperCase() : "",
    data.cep ? `CEP ${data.cep}` : ""
  ]
    .filter(Boolean)
    .join(", ");
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
