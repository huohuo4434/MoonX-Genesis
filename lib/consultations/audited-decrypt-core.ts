export async function decryptWithRequiredViewAudit<T>(input:{decrypt:()=>T;audit:()=>Promise<void>}):Promise<T>{
  const plaintext=input.decrypt();
  await input.audit();
  return plaintext;
}
