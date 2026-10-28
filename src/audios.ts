/**
 * Áudios dos recados de voz, num IndexedDB só deles (o localStorage das lojas não comporta áudio).
 * A chave é o id da captura. Ficam só neste aparelho: não sincronizam e não entram no backup.
 */

const BANCO = 'meusme-audios'
const LOJA = 'audios'

let aberto: Promise<IDBDatabase> | null = null

function abrir() {
  aberto ??= new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA)
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => {
      aberto = null
      reject(pedido.error)
    }
  })
  return aberto
}

async function pedir<T>(modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest<T>) {
  const banco = await abrir()
  return new Promise<T>((resolve, reject) => {
    const pedido = fazer(banco.transaction(LOJA, modo).objectStore(LOJA))
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error)
  })
}

export const guardarAudio = (id: string, audio: Blob) => pedir('readwrite', (l) => l.put(audio, id))
export const lerAudio = (id: string) => pedir<Blob | undefined>('readonly', (l) => l.get(id))
export const apagarAudio = (id: string) => pedir('readwrite', (l) => l.delete(id))
