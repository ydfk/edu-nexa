import { createAlova } from "alova";
import { createServerTokenAuthentication } from "alova/client";
import ReactHook from "alova/react";
import adapterFetch from "alova/fetch";

const { onAuthRequired, onResponseRefreshToken } = createServerTokenAuthentication({
  async login(response) {
    const data = await response.clone().json();
    localStorage.setItem("token", data.token);
  },
  assignToken: (method) => {
    method.config.headers.Authorization = localStorage.getItem("token");
  },
  logout() {
    localStorage.removeItem("token");
  },
});

export const alovaInstance = createAlova({
  baseURL: "/api",
  statesHook: ReactHook,
  requestAdapter: adapterFetch(),
  beforeRequest: onAuthRequired(),
  responded: onResponseRefreshToken(),
});
