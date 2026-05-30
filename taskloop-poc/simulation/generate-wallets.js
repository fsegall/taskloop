import { Keypair } from '@stellar/stellar-sdk';

const COUNT = 5;

console.log('\n========================================');
console.log('  TaskLoop — Wallets de Teste (Mainnet)');
console.log('========================================\n');

const wallets = Array.from({ length: COUNT }, (_, i) => {
  const kp = Keypair.random();
  return { index: i + 1, publicKey: kp.publicKey(), secretKey: kp.secret() };
});

wallets.forEach(({ index, publicKey, secretKey }) => {
  console.log(`Wallet ${index}`);
  console.log(`  Public : ${publicKey}`);
  console.log(`  Secret : ${secretKey}`);
  console.log();
});

console.log('⚠️  Cada wallet precisa receber pelo menos 1 XLM antes da demo');
console.log('    para existir na Mainnet (mínimo de saldo Stellar).');
console.log('    Use a treasury ou sua wallet principal para ativar cada uma.\n');
