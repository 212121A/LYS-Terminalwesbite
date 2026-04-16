import serverless from "serverless-http";
import { createApp } from "../artifacts/api-server/src/app";

export default serverless(createApp());
