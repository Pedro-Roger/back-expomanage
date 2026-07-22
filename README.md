# ExpoManage

Sistema de gerenciamento e venda de estandes baseado no documento técnico local e nos modelos do Stitch.

## Stack

- `packages/shared`: tipos, fixtures, validações e helpers puros.
- `apps/api`: API em TypeScript com estrutura NestJS, controllers/modules/services e repositório em memória para desenvolvimento local.
- `apps/web`: React + Vite com telas públicas e administrativas baseadas nos modelos do Stitch.

## Scripts

```bash
npm install
npm test
npm run build
npm run dev
```

## Telas Implementadas

- Lista pública de estandes com busca/filtros.
- Mapa visual de seleção de estandes.
- Formulário público de interesse com estande travado.
- Dashboard administrativo.
- Gestão administrativa de estandes.
- Solicitações recebidas.

## API Atual

A API já está organizada em módulos/controllers/services NestJS. Nesta etapa, ela usa dados em memória para acelerar validação local. A troca para MongoDB/Mongoose fica concentrada no repositório e não muda os contratos usados pelo front-end.

Login local de desenvolvimento:

```text
admin@expomanage.local
admin123
```

