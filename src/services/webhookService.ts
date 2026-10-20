export const enviarParaWebhook = async (url: string, payload: any) => {
  console.log("Payload enviado:", payload);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Falha no envio: " + response.status);
  }
  return { success: true };
};
