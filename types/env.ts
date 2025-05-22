declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SHOPIFY_API_KEY: string
      SHOPIFY_API_SECRET: string
      SHOPIFY_SCOPES: string
      HOST: string
    }
  }
}

// This export is required to make the file a module
export {}
