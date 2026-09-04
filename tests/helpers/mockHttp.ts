import type { HttpRequest, HttpResponse, HttpTransport } from "../../src/clients/http.client";

export class MockHttpTransport implements HttpTransport {
  readonly calls: HttpRequest[] = [];

  constructor(
    private readonly handler: (req: HttpRequest) => Partial<HttpResponse> | Promise<Partial<HttpResponse>>,
  ) {}

  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    this.calls.push(req);
    const result = await this.handler(req);
    return {
      status: result.status ?? 200,
      data: (result.data ?? {}) as T,
      headers: result.headers ?? {},
    };
  }
}
