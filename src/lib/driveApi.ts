/**
 * Google Drive API Integration Helpers
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

/**
 * Finds or creates the default "Noja ERP Backups" folder in Google Drive.
 * Returns the folder ID.
 */
export async function getOrCreateNojaFolder(token: string): Promise<string> {
  try {
    // 1. Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name = 'Noja ERP Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!searchRes.ok) {
      throw new Error(`Failed to query Google Drive folder. Status: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // 2. Folder does not exist, let's create it
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Noja ERP Backups',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Automated and manual ledger backups from Noja ERP Uganda'
      })
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create Google Drive folder. Status: ${createRes.status}`);
    }

    const createData = await createRes.json();
    return createData.id;
  } catch (error) {
    console.error('Error in getOrCreateNojaFolder:', error);
    throw error;
  }
}

/**
 * Uploads the full ERP state JSON to the "Noja ERP Backups" folder in Google Drive.
 */
export async function uploadBackupToDrive(
  token: string,
  state: any,
  fileName: string,
  folderId?: string
): Promise<DriveFile> {
  try {
    const parentFolderId = folderId || await getOrCreateNojaFolder(token);
    const boundary = 'noja_multipart_boundary_9988';
    
    const metadata = {
      name: fileName,
      parents: [parentFolderId],
      mimeType: 'application/json',
      description: 'System state snapshot backup from Noja ERP'
    };

    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      JSON.stringify(state, null, 2),
      `--${boundary}--`
    ].join('\r\n');

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,size,webViewLink';
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Upload failed with status ${res.status}: ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error in uploadBackupToDrive:', error);
    throw error;
  }
}

/**
 * Lists all backup JSON files in the designated "Noja ERP Backups" folder.
 */
export async function listBackupsInDrive(token: string, folderId?: string): Promise<DriveFile[]> {
  try {
    const targetFolderId = folderId || await getOrCreateNojaFolder(token);
    const query = `'${targetFolderId}' in parents and mimeType = 'application/json' and trashed = false`;
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,createdTime,size,webViewLink)&orderBy=createdTime desc`;

    const res = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to list files. Status: ${res.status}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Error in listBackupsInDrive:', error);
    throw error;
  }
}

/**
 * Downloads and parses the JSON file contents from Google Drive.
 */
export async function downloadBackupFromDrive(token: string, fileId: string): Promise<any> {
  try {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to download file. Status: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error in downloadBackupFromDrive:', error);
    throw error;
  }
}

/**
 * Deletes a backup file from Google Drive (moved to trash or permanent deleted).
 * Note: Always confirm with the user prior to calling this from the UI.
 */
export async function deleteBackupFromDrive(token: string, fileId: string): Promise<boolean> {
  try {
    const deleteUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const res = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to delete file. Status: ${res.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteBackupFromDrive:', error);
    throw error;
  }
}

/**
 * Uploads a text or markdown business report to Google Drive.
 */
export async function uploadReportToDrive(
  token: string,
  fileName: string,
  reportText: string,
  folderId?: string
): Promise<DriveFile> {
  try {
    const parentFolderId = folderId || await getOrCreateNojaFolder(token);
    const boundary = 'noja_multipart_boundary_9988';
    
    const metadata = {
      name: fileName,
      parents: [parentFolderId],
      mimeType: 'text/markdown',
      description: 'Exported business report from Noja ERP'
    };

    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: text/markdown; charset=UTF-8',
      '',
      reportText,
      `--${boundary}--`
    ].join('\r\n');

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,size,webViewLink';
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Report upload failed with status ${res.status}: ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error in uploadReportToDrive:', error);
    throw error;
  }
}
