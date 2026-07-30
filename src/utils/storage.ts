import { openDB, type IDBPDatabase } from 'idb';
import type { Project, VideoFile } from '../types';

const DB_NAME = 'freemaker';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          // Add videoBlobs store for storing raw video file data
          if (!db.objectStoreNames.contains('videoBlobs')) {
            db.createObjectStore('videoBlobs', { keyPath: 'id' });
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();

  // Save video file data separately if present
  if (project.video?.file) {
    await db.put('videoBlobs', {
      id: project.video.id,
      name: project.video.file.name,
      type: project.video.file.type,
      size: project.video.file.size,
      data: project.video.file,
    });
  }

  // Save project metadata (without the File object and blob URLs)
  const projectData = {
    ...project,
    video: project.video
      ? {
          id: project.video.id,
          name: project.video.name,
          url: '', // Object URLs can't be persisted
          duration: project.video.duration,
          width: project.video.width,
          height: project.video.height,
          size: project.video.size,
          uploadedAt: project.video.uploadedAt,
        }
      : null,
    // Don't persist blob URLs or blob data for voiceover tracks
    // (they would need to be re-recorded after page load)
    voiceoverTracks: [],
  };

  await db.put('projects', projectData);
}

export interface StoredVideoFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: File;
}

export async function loadProjects(): Promise<{ project: Project; videoFile?: StoredVideoFile }[]> {
  const db = await getDB();
  const projects = await db.getAll('projects');
  const sorted = projects.sort(
    (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
  );

  const results: { project: Project; videoFile?: StoredVideoFile }[] = [];

  for (const project of sorted) {
    let videoFile: StoredVideoFile | undefined;

    // Restore video file if we have it stored
    if (project.video?.id) {
      videoFile = await db.get('videoBlobs', project.video.id);
      if (videoFile?.data) {
        const file = videoFile.data;
        const url = URL.createObjectURL(file);
        project.video = {
          ...project.video,
          file,
          url,
        };
      } else {
        // Blob data missing — treat as if no video
        project.video = null;
      }
    }

    results.push({ project, videoFile });
  }

  return results;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  const project = await db.get('projects', id);
  if (project?.video?.id) {
    await db.delete('videoBlobs', project.video.id);
  }
  await db.delete('projects', id);
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  await db.clear('projects');
  await db.clear('files');
  await db.clear('videoBlobs');
}
