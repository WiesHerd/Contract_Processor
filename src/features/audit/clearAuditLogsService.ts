import { generateClient } from 'aws-amplify/api';
import { listAuditLogs } from '@/graphql/queries';
import { deleteAuditLog } from '@/graphql/mutations';

export async function clearAllAuditLogs() {
  const client = generateClient();
  // 1. Fetch all audit log IDs (handle pagination if needed)
  let nextToken: string | null = null;
  let allIds: string[] = [];
  do {
    const result: any = await client.graphql({
      query: listAuditLogs,
      variables: { limit: 1000, nextToken },
    });
    const items = result.data.listAuditLogs?.items || [];
    allIds.push(...items.map((item: any) => item.id));
    nextToken = result.data.listAuditLogs?.nextToken || null;
  } while (nextToken);

  // 2. Batch delete all logs (sequentially for now)
  for (const id of allIds) {
    try {
      await client.graphql({
        query: deleteAuditLog,
        variables: { input: { id } },
      });
    } catch (err) {
      // Log and continue
      console.error('Failed to delete audit log', id, err);
    }
  }
  return allIds.length;
} 