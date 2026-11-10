import { useState } from 'react'
import { PassoForm } from '../components/PassoForm'
import { contagemDasRotinas } from '../rotinas'
import { pendentes, useStore } from '../store'
import type { Passo } from '../types'
import { Botao } from '../tema/megui-react.mjs'
import { PassoEditavel } from './Projetos'

/**
 * Em espera, depois de organizado: Para organizar guarda o que ainda não tem forma; Tarefas e Rotinas, o que já virou
 * ação definida fora de projetos. Em ação mostra uma de cada vez; aqui dá para ver todas, corrigir ou tirar da lista.
 */
function NovaTarefa({ rotina }: Readonly<{ rotina: boolean }>) {
  const criar = useStore((s) => s.criarPasso)
  const [aberto, setAberto] = useState(false)
  if (!aberto)
    return (
      <Botao variante="acento" onClick={() => setAberto(true)}>
        {rotina ? 'Nova rotina' : 'Nova tarefa'}
      </Botao>
    )
  return (
    <div className="cartao">
      <PassoForm
        rotuloBotao={rotina ? 'Adicionar rotina' : 'Adicionar tarefa'}
        datasIniciais={rotina ? { repetir: 'diario' } : {}}
        onSalvar={(t, e, d) => criar(null, t, e, undefined, d)}
        onCancelar={() => setAberto(false)}
        rotuloCancelar="Fechar"
      />
    </div>
  )
}

/** Tarefas definidas fora de projetos e que não se repetem. */
export function Tarefas() {
  const passos = useStore((s) => s.passos)
  const tarefas = pendentes(passos, null).filter((p) => !p.repetir)
  return (
    <section className="tela">
      <NovaTarefa rotina={false} />
      {tarefas.length > 0 ? (
        <>
          <h2>Tarefas definidas ({tarefas.length})</h2>
          <p className="motivo">Fora de projetos. Em ação mostra uma de cada vez; aqui dá para ver todas, corrigir ou tirar da lista.</p>
          <div className="cartao">
            {tarefas.map((p) => (
              <PassoEditavel key={p.id} passo={p} />
            ))}
          </div>
        </>
      ) : (
        <p className="vazio-texto">
          Nenhuma tarefa definida fora de projetos. O que entra por Capturar fica em Para organizar até virar tarefa aqui.
        </p>
      )}
    </section>
  )
}

const GRUPOS: { repetir: NonNullable<Passo['repetir']>; nome: string; unidade: string }[] = [
  { repetir: 'diario', nome: 'Todo dia', unidade: 'dias' },
  { repetir: 'semanal', nome: 'Toda semana', unidade: 'semanas' },
  { repetir: 'mensal', nome: 'Todo mês', unidade: 'mês' },
]

/** O que se repete: a vez pendente de cada rotina, por frequência, com a contagem das últimas 4 semanas. */
export function Rotinas() {
  const passos = useStore((s) => s.passos)
  const projetos = useStore((s) => s.projetos)
  const rotinas = passos.filter((p) => p.repetir && !p.feitoEm).sort((a, b) => a.ordem - b.ordem)
  const contagem = new Map(contagemDasRotinas(passos).map((c) => [c.id, c]))
  const titulo = new Map(projetos.map((p) => [p.id, p.titulo]))
  return (
    <section className="tela">
      <NovaTarefa rotina />
      {rotinas.length === 0 && (
        <p className="vazio-texto">
          Nenhuma rotina ainda. Uma rotina volta sozinha depois de feita: tomar o remédio todo dia, lavar a roupa toda
          semana, pagar o aluguel todo mês.
        </p>
      )}
      {GRUPOS.map((g) => {
        const doGrupo = rotinas.filter((p) => p.repetir === g.repetir)
        if (doGrupo.length === 0) return null
        return (
          <div key={g.repetir}>
            <h2>
              {g.nome} ({doGrupo.length})
            </h2>
            <div className="cartao">
              {doGrupo.map((p) => {
                const c = contagem.get(p.id)
                const projeto = p.projetoId ? titulo.get(p.projetoId) : undefined
                return (
                  <div key={p.id}>
                    <PassoEditavel passo={p} />
                    {(c || projeto) && (
                      <p className="motivo">
                        {[projeto && `no projeto ${projeto}`, c && `${c.vezes} de ${c.esperado} ${g.unidade} nas últimas 4 semanas`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
