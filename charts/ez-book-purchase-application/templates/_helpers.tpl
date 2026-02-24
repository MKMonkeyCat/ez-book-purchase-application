{{- define "ez-book-purchase-application.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ez-book-purchase-application.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "ez-book-purchase-application.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ez-book-purchase-application.labels" -}}
helm.sh/chart: {{ include "ez-book-purchase-application.chart" . }}
app.kubernetes.io/name: {{ include "ez-book-purchase-application.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "ez-book-purchase-application.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ez-book-purchase-application.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "ez-book-purchase-application.secretName" -}}
{{- if .Values.secret.name -}}
{{- .Values.secret.name -}}
{{- else -}}
{{- printf "%s-env" (include "ez-book-purchase-application.fullname" .) -}}
{{- end -}}
{{- end -}}
