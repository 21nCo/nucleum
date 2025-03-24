export function widget(body: any, widget: string) {
  console.log({ body, widget });
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello, world!" })
  };
}
