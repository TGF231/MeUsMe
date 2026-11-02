import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lerOFX, pareceOFX } from '../src/ofx.ts'

// OFX 1.x (SGML): cabeçalho em texto, tags sem fechamento, como exportam vários bancos brasileiros.
const sgml = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
ENCODING:USASCII
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>0260<ACCTID>12345-6<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261028000000[-3:BRT]
<TRNAMT>-35,90
<FITID>abc-1
<MEMO>Padaria Pão &amp; Cia
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261030
<TRNAMT>1500.00
<FITID>abc-2
<NAME>Salário
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261030
<TRNAMT>0.00
<FITID>abc-3
<MEMO>Tarifa zerada
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`

const xml = `<?xml version="1.0"?><?OFX OFXHEADER="200" VERSION="220"?>
<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><CCACCTFROM><ACCTID>9999</ACCTID></CCACCTFROM><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261015</DTPOSTED><TRNAMT>-89.00</TRNAMT><FITID>x1</FITID><MEMO>Mercado</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261015</DTPOSTED><TRNAMT>-89.00</TRNAMT><MEMO>Mercado</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261015</DTPOSTED><TRNAMT>-89.00</TRNAMT><MEMO>Mercado</MEMO></STMTTRN>
</BANKTRANLIST></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`

test('reconhece OFX pelo cabeçalho, e CSV não', () => {
  assert.equal(pareceOFX(sgml), true)
  assert.equal(pareceOFX(xml), true)
  assert.equal(pareceOFX('Data;Valor;Descrição\n01/10/2026;-10,00;Café'), false)
})

test('OFX 1.x: data, valor com vírgula, entidades e valor zero ignorado', () => {
  const { ok, ignoradas } = lerOFX(sgml, 'conta')
  assert.equal(ignoradas, 1)
  assert.deepEqual(ok, [
    { data: '2026-10-28', valor: -3590, descricao: 'Padaria Pão & Cia', chave: 'ofx:12345-6:abc-1' },
    { data: '2026-10-30', valor: 150000, descricao: 'Salário', chave: 'ofx:12345-6:abc-2' },
  ])
})

test('OFX 2.x: usa FITID quando há, e sem FITID lançamentos iguais no mesmo dia continuam distintos', () => {
  const { ok } = lerOFX(xml, 'conta')
  assert.equal(ok.length, 3)
  assert.equal(ok[0].chave, 'ofx:9999:x1')
  assert.notEqual(ok[1].chave, ok[2].chave)
  assert.equal(new Set(ok.map((l) => l.chave)).size, 3)
})

test('reimportar o mesmo arquivo gera as mesmas chaves (não duplica)', () => {
  assert.deepEqual(lerOFX(xml, 'conta').ok.map((l) => l.chave), lerOFX(xml, 'conta').ok.map((l) => l.chave))
})
