/* eslint-disable @typescript-eslint/no-explicit-any */
import AWS from 'aws-sdk';
import { Bucket, parseBucketUri } from './s3Helpers';

// interface PutObjectRequestParamsX {
//     Bucket: any
//     Key: any
// }

// interface PutObjectRequestX {
//     on: (event: string, listener: any) => void
//     send: () => void
// }

// interface HeadObjectParamsX {
//     Bucket: any
//     Key: any
// }

// interface GetObjectParamsX {
//     Bucket: any
//     Key: any
// }

// interface DeleteObjectParamsX {
//     Bucket: any
//     Key: any
// }

// interface GetSignedUrlParamsX {
//     Bucket: any
//     Key: any
//     Expires: number
// }

// export interface HeadObjectOutputX {
//     ContentLength?: number
//     Metadata?: any
// }

// export interface PutBucketCorsParamsX {
//     Bucket: string
//     CORSConfiguration: any
// }

// interface CreateMultipartUploadParamsX {
//     Bucket: any
//     Key: any
// }

// interface S3Client {
//     putObject: (params: PutObjectRequestParamsX) => PutObjectRequestX
//     headObject: (params: HeadObjectParamsX, callback: (err?: any & {statusCode: number}, data?: HeadObjectOutputX) => void) => void
//     getObject: (params: GetObjectParamsX, callback: (err?: any, data?: any) => void) => void
//     deleteObject: (params: DeleteObjectParamsX, callback: (err?: any) => void) => void
//     getSignedUrl: (operation: string, params: GetSignedUrlParamsX, callback: (err?: any, url?: string) => void) => void
//     listObjectsV2: (params: {Bucket: string, Prefix: string, ContinuationToken?: string, MaxKeys?: number}, callback: (err?: any, data?: any) => void) => void
//     copyObject: (params: {Bucket: string, CopySource: string, Key: string}, callback: (err?: any, data?: any) => void) => void
//     putBucketCors: (params: PutBucketCorsParamsX, callback: (err?: any, data?: any) => void) => void
//     createMultipartUpload: (params: CreateMultipartUploadParamsX, callback: (err?: any, data?: any) => void) => void
// }

// const defaultS3Client = new AWS.S3({
//     apiVersion: "2006-03-01",
//     accessKeyId: process.env['FILEBASE_ACCESS_KEY'],
//     secretAccessKey: process.env['FILEBASE_SECRET_ACCESS_KEY'],
//     endpoint: "https://s3.filebase.com",
//     region: "us-east-1",
//     s3ForcePathStyle: true,
//     signatureVersion: 'v4'
// })

class ObjectCache<T> {
    private cache: {[key: string]: {timestamp: number, value: T}} = {}
    private expirationMSec: number
    constructor(expirationMSec: number) {
        this.expirationMSec = expirationMSec
    }
    get(key: string): T | undefined {
        const x = this.cache[key]
        if (!x) return undefined
        if (Date.now() - x.timestamp > this.expirationMSec) {
            delete this.cache[key]
            return undefined
        }
        return x.value
    }
    set(key: string, value: T) {
        this.cache[key] = {timestamp: Date.now(), value}
    }
}

const hashOfString = (s: string): number => {
    let hash = 0
    if (s.length == 0) return hash
    for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return hash
}

const expirationMSec = 1000 * 60 * 10
const s3ClientObjectCache = new ObjectCache<AWS.S3>(expirationMSec)

const getS3Client = (bucket: Bucket): AWS.S3 => {
    const k = `${bucket.uri}:${hashOfString(bucket.credentials)}`
    const x = s3ClientObjectCache.get(k)
    if (x) return x
    let ret: AWS.S3
    const {service, region} = parseBucketUri(bucket.uri)
    if (['aws', 'wasabi', 'r2', 'google'].includes(service)) {
        const cred = JSON.parse(bucket.credentials || '{}')
        for (const k of ['accessKeyId', 'secretAccessKey']) {
            if (!cred[k]) {
                throw Error(`Missing in credentals: ${k}`)
            }
        }
        const accessKeyId = cred.accessKeyId
        const secretAccessKey = cred.secretAccessKey
        const o: any = {
            apiVersion: "2006-03-01",
            accessKeyId,
            secretAccessKey,
            region,
            s3ForcePathStyle: true,
            signatureVersion: 'v4'
        }
        if (service === 'wasabi') {
            o.endpoint = `https://s3.${region}.wasabisys.com`
        }
        else if (service === 'r2') {
            if (!cred.endpoint) {
                throw Error('No endpoint in credentials for r2')
            }
            o.region = 'auto'
            o.endpoint = cred.endpoint
        }
        else if (service === 'google') {
            o.endpoint = "https://storage.googleapis.com"
        }
        ret = new AWS.S3(o)
    }
    else {
        throw Error(`Unsupported bucket service: ${service} for uri ${bucket.uri}`)
    }
    s3ClientObjectCache.set(k, ret)
    return ret
}

export default getS3Client