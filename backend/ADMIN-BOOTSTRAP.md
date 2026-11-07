# Primeiro administrador

O primeiro administrador pode ser criado pelo formulário web temporário,
protegido por uma chave definida no ambiente do backend. Não use uma rota
pública sem chave nem coloque a chave na URL.

## Sem acesso ao Shell do Render

1. Publique as alterações do backend e do frontend.
2. No dashboard do Render, abra o serviço backend e adicione a variável
   `ADMIN_BOOTSTRAP_TOKEN` com um valor aleatório de pelo menos 32 caracteres.
   Gere uma chave localmente, por exemplo com Node.js:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Salve a variável e aguarde o backend reiniciar. Confirme que as migrações já
   foram executadas.
4. Abra `https://fl-finance-12nf.vercel.app/first-admin`, cole a chave no
   formulário e preencha os dados do administrador. Use uma senha com pelo
   menos 12 caracteres.
5. Após a confirmação, remova `ADMIN_BOOTSTRAP_TOKEN` do Render. A configuração
   também é de uso único: após a primeira criação, o backend rejeita novas
   tentativas mesmo que a variável continue configurada.
6. Entre pela página de login normal e acesse `/admin`.

A chave nunca deve ser colocada na URL, no código do frontend, em um commit ou
em uma mensagem/log. O endpoint recebe a chave somente em um cabeçalho HTTPS,
tem limitação de tentativas, compara o segredo em tempo constante e só funciona
antes de existir administrador e enquanto o sinalizador inicial estiver
pendente. A criação do usuário e a conclusão do sinalizador ocorrem na mesma
transação.

## Com acesso a um terminal

Como alternativa, após executar as migrações, o operador pode criar a conta
diretamente no terminal interativo do backend:

```sh
npm run admin:bootstrap
```

O comando solicita usuário, email e senha sem exibi-la. Ele também só funciona
uma vez e não promove contas existentes.

## Arquivamento de contas

No painel `/admin`, “Excluir” arquiva a conta e encerra suas sessões, sem apagar
os dados financeiros nesse momento. Contas arquivadas aparecem no filtro
“Arquivados” e podem ser restauradas durante 30 dias. Depois desse prazo, o
backend remove permanentemente a conta e seus dados vinculados em uma rotina
executada ao iniciar o serviço e, enquanto estiver ativo, a cada hora. Mantenha
as migrações aplicadas e o serviço backend ativo para que a rotina execute.
