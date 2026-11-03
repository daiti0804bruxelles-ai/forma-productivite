export type DataRevision = { exists: boolean; updatedAt: string | null }
export class SaveConflictError extends Error {
  constructor() { super('Les données ont changé sur un autre appareil. Votre version ne sera pas écrasée automatiquement.'); this.name = 'SaveConflictError' }
}
/** Sérialise les sauvegardes d'un compte. Une erreur bloque la file : aucune
 * tentative ultérieure ne doit écraser une version distante non relue. */
export class SnapshotWriter<T> {
  private queue: Promise<void> = Promise.resolve()
  private stopped: unknown
  private revision: DataRevision
  private write: (data: T, revision: DataRevision) => Promise<DataRevision>
  constructor(revision: DataRevision, write: (data: T, revision: DataRevision) => Promise<DataRevision>) { this.revision = revision; this.write = write }
  save(data: T): Promise<void> {
    const request = this.queue.then(async () => {
      if (this.stopped) throw this.stopped
      try { this.revision = await this.write(data, this.revision) }
      catch (error) { this.stopped = error; throw error }
    })
    this.queue = request.catch(() => {})
    return request
  }
}
