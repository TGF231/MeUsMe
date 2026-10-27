import { useState } from 'react'
import { useStore } from '../store'
import { useConfig } from '../stores/config'

const TELAS = [
  {
    titulo: 'Uma coisa de cada vez.',
    texto:
      'A tela Agora mostra só o próximo passo, escolhido pela sua energia e pelo que está mais perto de acabar. Você não precisa decidir entre vinte coisas: só se começa esta.',
  },
  {
    titulo: 'Tire da cabeça.',
    texto:
      'Ideia, tarefa, gasto, compromisso: toque em + e escreva. Organizar fica para depois, na Caixa. O que está guardado aqui não precisa ficar ocupando a sua memória.',
  },
  {
    titulo: 'Linha de chegada.',
    texto:
      'Todo projeto nasce com um fim que dá para ver, como “currículo enviado para 3 vagas”. Perto do final, quando a meta parece fugir, ela continua no mesmo lugar, e a barra mostra quanto já foi andado.',
  },
  {
    titulo: 'Sem culpa.',
    texto:
      'Nada aqui fica vermelho por atraso nem conta sequências perdidas. Um dia sem nada feito também é um dia. Voltou depois de um tempo? É só escolher uma coisa leve.',
  },
]

/** Primeiro uso: quatro telas curtas e a opção de um projeto de exemplo. */
export function Introducao() {
  const [i, setI] = useState(0)
  const s = useStore()
  const ajustar = useConfig((c) => c.ajustar)
  const fim = i === TELAS.length - 1
  // A revisão semanal começa a contar a partir de hoje, para não aparecer logo no primeiro dia.
  const concluir = () => ajustar({ introducaoVista: true, revisaoFeitaEm: Date.now() })

  const criarExemplo = () => {
    const pid = s.criarProjeto('Conhecer o MeUsMe', 'Concluí um passo e vi quanto tempo ele levou no Histórico')
    s.criarPasso(pid, 'Tocar em Começar neste passo e depois em Feito', 1)
    s.criarPasso(pid, 'Guardar uma ideia qualquer pelo botão +', 1)
    s.criarPasso(pid, 'Abrir o Histórico e ver o tempo do primeiro passo', 1)
    s.definirFoco(pid)
    concluir()
  }

  return (
    <section className="tela centro introducao">
      <div className="cartao celebra">
        <p className="grande">{TELAS[i].titulo}</p>
        <p>{TELAS[i].texto}</p>
        <div className="pontinhos" role="img" aria-label={`Tela ${i + 1} de ${TELAS.length}`}>
          {TELAS.map((_, j) => (
            <span key={j} className={j === i ? 'ativo' : ''} />
          ))}
        </div>
        {fim ? (
          <>
            <div className="linha centralizada">
              <button className="primario" onClick={criarExemplo}>
                Começar com um projeto de exemplo
              </button>
              <button onClick={concluir}>Começar vazio</button>
            </div>
            <p className="motivo">
              O MeUsMe é uma ferramenta de organização. Não é tratamento e não substitui acompanhamento profissional.
            </p>
          </>
        ) : (
          <div className="linha centralizada">
            <button className="primario" onClick={() => setI(i + 1)}>
              Continuar
            </button>
            <button className="discreto" onClick={concluir}>
              Pular
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
