/**
 * Microsoft Graph API Client
 * Requires: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID
 */

import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential } from '@azure/identity'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'

let graphClient: Client | null = null

export function getGraphClient(): Client {
  if (graphClient) return graphClient

  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  const tenantId = process.env.AZURE_TENANT_ID

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing Azure credentials: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID')
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret)
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  })

  graphClient = Client.initWithMiddleware({ authProvider })
  return graphClient
}

/**
 * Upload file to SharePoint
 */
export async function uploadToSharePoint(
  siteId: string,
  folderId: string,
  fileName: string,
  fileContent: Buffer
): Promise<string> {
  const client = getGraphClient()

  const response = await client
    .api(`/sites/${siteId}/drive/items/${folderId}:/${fileName}:/content`)
    .put(fileContent)

  return response.webUrl || ''
}

/**
 * Get customer data from SharePoint list
 */
export async function getCustomerFromSharePoint(customerId: string): Promise<any> {
  const client = getGraphClient()

  // TODO: Configure with actual SharePoint site ID and list ID
  const response = await client
    .api(`/sites/{site-id}/lists/{list-id}/items`)
    .filter(`fields/CustomerId eq '${customerId}'`)
    .get()

  return response.value?.[0] || null
}

/**
 * Send email via Microsoft Graph
 */
export async function sendEmailViaGraph(
  to: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  const client = getGraphClient()

  try {
    await client.api('/me/sendMail').post({
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: htmlBody,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
    })
    return true
  } catch (err) {
    console.error('[Graph Mail] Error sending email:', err)
    return false
  }
}
