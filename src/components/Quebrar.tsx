import { useState } from 'react'
import { useStore } from '../store'
import type { Passo } from '../types'
import { PassoForm } from './PassoForm'

/**
 * Quebrar um passo grande em pedaços (V20 em docs/CONCORRENTES.md), guiado e sem nuvem: o primeiro pedaço é o
 * movimento de 2 minutos, os seguintes vêm com "e depois disso?" até você dizer que basta. Cada pedaço entra antes
 * do original, na ordem em que foi escrito, com energia baixa por padrão e o mesmo prazo. O original continua na fila.
 */
export function Quebrar({ passo, onPronto }: { passo: Passo; onPronto: () => void }) {
  const s = useStore()
  const [pedacos, setPedacos] = useState<string[]>([])

  return (
    <div className="quebrar">
      {pedacos.length > 0 && (
        <>
          <p className="rotulo">Antes de “{passo.texto}”:</p>
          <ol className="lista-simples">
            {pedacos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </>
      )}
      <PassoForm
        key={pedacos.length}
        pergunta={pedacos.length === 0 ? 'Qual é o menor pedaço disso que dá para fazer em 2 minutos?' : 'E depois disso, o que vem?'}
        rotuloBotao={pedacos.length === 0 ? 'Fazer este primeiro' : 'Acrescentar'}
        sugerir={false}
        comDatas={false}
        energiaInicial={1}
        onSalvar={(t, e) => {
          // O pedaço herda o prazo: senão, numa tarefa solta, o original com prazo seguiria vencendo os pedaços no Agora.
          s.criarPasso(passo.projetoId, t, e, passo.id, { prazo: passo.prazo })
          setPedacos([...pedacos, t])
        }}
        onCancelar={onPronto}
        rotuloCancelar={pedacos.length === 0 ? 'Cancelar' : 'Pronto'}
      />
    </div>
  )
}
